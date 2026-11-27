use candid::CandidType;
use ic_stable_structures::StableBTreeMap;
use serde::Deserialize;
use std::cell::RefCell;
use std::collections::BTreeMap;

use super::time::time_seconds;
use super::ONE_DAY_SECS;
use crate::stable_memory::{
    get_memory, Memory, ICP_TO_USD_DAILY_HISTORY_MEMORY_ID, USD_TO_FIAT_DAILY_HISTORY_MEMORY_ID,
};

/// 1 January 2025 at 00:00 UTC, the first day of the history.
/// For older days, the XRC has few ICP and stablecoin sources.
pub(super) const FIRST_DAY_START_SECONDS: u64 = 1_735_689_600;

/// The XRC updates the forex rates of a day for up to 2 days after it. While a day has no forex
/// rate yet, the XRC returns the rate of an earlier day. Thus the history stores the final
/// USD/fiat rate of a day in stable memory only when the day started at least this long ago,
/// and keeps that rate.
/// For the days in this delay window, the history keeps a non-final USD/fiat rate on the heap.
/// Each gap fill fetches it again, and the list marks it as not final.
pub(super) const FIAT_RATE_DELAY_SECS: u64 = 3 * ONE_DAY_SECS;

/// After the first failed fetch, a rate is not listed as missing for this long.
/// The gap fill runs every 6 hours, so the next run tries the rate again, but the batches that
/// follow the failed one in the same run do not.
pub(super) const FETCH_RETRY_DELAY_SECS: u64 = 5 * 3_600;

/// Each failed fetch doubles the retry delay, up to this delay.
/// Each fetch costs cycles, so this limits the cost of a rate that the XRC cannot give.
pub(super) const MAX_FETCH_RETRY_DELAY_SECS: u64 = 30 * ONE_DAY_SECS;

/// After a fetch of a non-final rate, successful or not, the rate is not listed for this long.
/// The gap fill runs every 6 hours, so each run fetches each non-final rate one time, and the
/// batches that follow in the same run do not. A failed fetch does not increase this delay.
pub(super) const NON_FINAL_REFETCH_DELAY_SECS: u64 = 5 * 3_600;

/// The failed fetches of one missing rate.
#[derive(Clone, Copy, Debug, Default)]
struct FailedFetches {
    count: u8,
    last_failed_seconds: u64,
}

/// An ISO 4217 currency code, e.g. "EUR".
type FiatSymbolBytes = [u8; 3];

/// The USD/fiat rate of a day in the delay window, which the XRC can still change.
#[derive(Clone, Copy, Debug)]
struct NonFinalFiatRate {
    /// `None` until a fetch succeeds.
    rate_e8s: Option<u64>,
    last_fetch_seconds: u64,
}

/// The rates at 00:00 UTC of one day.
#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct DailyRate {
    /// 00:00 UTC of the day.
    pub timestamp_seconds: u64,
    /// For example, 264_000_000 means that 1 ICP buys 2.64 USD.
    pub icp_to_usd_e8s: Option<u64>,
    /// Units of the requested fiat currency for one USD.
    /// For example, 92_000_000 for "EUR" means that 1 USD buys 0.92 EUR.
    pub usd_to_fiat_e8s: Option<u64>,
    /// `true` if `usd_to_fiat_e8s` is the final rate of the day.
    /// `false` if it is a non-final rate of a day in the last `FIAT_RATE_DELAY_SECS`, which can
    /// still change, or if `usd_to_fiat_e8s` is `None`.
    pub usd_to_fiat_is_final: bool,
}

/// The pair of one rate in the history.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum DailyRatePair {
    IcpToUsd,
    /// USD to the fiat currency with this ISO 4217 code.
    UsdToFiat(&'static str),
}

/// A rate that the history does not have yet.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct MissingDailyRate {
    pub day_start_seconds: u64,
    pub pair: DailyRatePair,
}

thread_local! {
    /// Maps 00:00 UTC of each day, in seconds, to the ICP/USD rate in e8s.
    static ICP_TO_USD_RATES_E8S: RefCell<StableBTreeMap<u64, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(get_memory(ICP_TO_USD_DAILY_HISTORY_MEMORY_ID))
    );

    /// Maps the fiat symbol and 00:00 UTC of each day, in seconds, to the USD/fiat rate in e8s.
    /// The symbol comes first, so that the days of one currency are next to each other.
    static USD_TO_FIAT_RATES_E8S: RefCell<StableBTreeMap<(FiatSymbolBytes, u64), u64, Memory>> =
        RefCell::new(StableBTreeMap::init(get_memory(USD_TO_FIAT_DAILY_HISTORY_MEMORY_ID)));

    /// The failed fetches of each missing rate.
    /// It lives on the heap, so an upgrade clears it.
    static FAILED_FETCHES: RefCell<BTreeMap<MissingDailyRate, FailedFetches>> = RefCell::default();

    /// Maps the fiat symbol and 00:00 UTC of each day in the delay window, in seconds, to the
    /// non-final USD/fiat rate. It lives on the heap, so an upgrade clears it, and the next gap
    /// fill fetches the rates again.
    static NON_FINAL_USD_TO_FIAT_RATES: RefCell<BTreeMap<(FiatSymbolBytes, u64), NonFinalFiatRate>> =
        RefCell::default();
}

/// Stores the rate of the day that starts at `day_start_seconds`.
pub fn add_rate(pair: DailyRatePair, day_start_seconds: u64, rate_e8s: u64) {
    match pair {
        DailyRatePair::IcpToUsd => ICP_TO_USD_RATES_E8S.with(|rates_e8s| {
            let _previous_rate_e8s = rates_e8s.borrow_mut().insert(day_start_seconds, rate_e8s);
        }),
        DailyRatePair::UsdToFiat(symbol) => {
            let Some(symbol_bytes) = to_fiat_symbol_bytes(symbol) else {
                ic_cdk::println!("Failed to store the daily {symbol} rate: invalid symbol");
                return;
            };
            USD_TO_FIAT_RATES_E8S.with(|rates_e8s| {
                let _previous_rate_e8s = rates_e8s
                    .borrow_mut()
                    .insert((symbol_bytes, day_start_seconds), rate_e8s);
            });
        }
    }
}

/// Returns the rates of the days that start in `from_seconds..to_seconds`, oldest first.
/// Days without a rate have no entry. Without `fiat_symbol`, each `usd_to_fiat_e8s` is `None`.
/// A final USD/fiat rate comes first. Without it, the list gives the non-final rate.
pub fn list_rates(from_seconds: u64, to_seconds: u64, fiat_symbol: Option<&str>) -> Vec<DailyRate> {
    if from_seconds >= to_seconds {
        return vec![];
    }

    let mut rates_by_day = BTreeMap::<u64, DailyRate>::new();

    ICP_TO_USD_RATES_E8S.with(|rates_e8s| {
        for entry in rates_e8s.borrow().range(from_seconds..to_seconds) {
            rates_by_day
                .entry(*entry.key())
                .or_insert_with(|| empty_daily_rate(*entry.key()))
                .icp_to_usd_e8s = Some(entry.value());
        }
    });

    if let Some(symbol_bytes) = fiat_symbol.and_then(to_fiat_symbol_bytes) {
        USD_TO_FIAT_RATES_E8S.with(|rates_e8s| {
            let range = (symbol_bytes, from_seconds)..(symbol_bytes, to_seconds);
            for entry in rates_e8s.borrow().range(range) {
                let (_, day_start_seconds) = *entry.key();
                let rate = rates_by_day
                    .entry(day_start_seconds)
                    .or_insert_with(|| empty_daily_rate(day_start_seconds));
                rate.usd_to_fiat_e8s = Some(entry.value());
                rate.usd_to_fiat_is_final = true;
            }
        });

        NON_FINAL_USD_TO_FIAT_RATES.with(|non_final_rates| {
            let range = (symbol_bytes, from_seconds)..(symbol_bytes, to_seconds);
            for (&(_, day_start_seconds), non_final_rate) in non_final_rates.borrow().range(range) {
                let Some(rate_e8s) = non_final_rate.rate_e8s else {
                    continue;
                };
                let rate = rates_by_day
                    .entry(day_start_seconds)
                    .or_insert_with(|| empty_daily_rate(day_start_seconds));
                if rate.usd_to_fiat_e8s.is_none() {
                    rate.usd_to_fiat_e8s = Some(rate_e8s);
                }
            }
        });
    }

    rates_by_day.into_values().collect()
}

/// Records one failed fetch of `missing_rate`.
pub fn record_failed_fetch(missing_rate: MissingDailyRate) {
    let now_seconds = time_seconds();
    FAILED_FETCHES.with(|failed_fetches| {
        let mut failed_fetches = failed_fetches.borrow_mut();
        let failed = failed_fetches.entry(missing_rate).or_default();
        failed.count = failed.count.saturating_add(1);
        failed.last_failed_seconds = now_seconds;
    });
}

/// Returns each rate that the history misses, from today back to `FIRST_DAY_START_SECONDS`.
/// The newest day comes first. In one day, ICP/USD comes first, then `fiat_symbols` in order.
/// The USD/fiat rates of the days in the last `FIAT_RATE_DELAY_SECS` are not listed.
/// A rate that failed to fetch is not listed until its retry delay ends.
pub fn list_missing_rates(fiat_symbols: &[&'static str]) -> Vec<MissingDailyRate> {
    let now_seconds = time_seconds();
    let newest_day_start_seconds = get_day_start_seconds(now_seconds);
    if newest_day_start_seconds < FIRST_DAY_START_SECONDS {
        return vec![];
    }
    let day_count =
        (newest_day_start_seconds.saturating_sub(FIRST_DAY_START_SECONDS)) / ONE_DAY_SECS + 1;

    let missing_rates = ICP_TO_USD_RATES_E8S.with(|icp_rates_e8s| {
        USD_TO_FIAT_RATES_E8S.with(|fiat_rates_e8s| {
            let icp_rates_e8s = icp_rates_e8s.borrow();
            let fiat_rates_e8s = fiat_rates_e8s.borrow();

            let mut missing_rates = vec![];
            for day_index in 0..day_count {
                let day_start_seconds =
                    newest_day_start_seconds.saturating_sub(day_index.saturating_mul(ONE_DAY_SECS));

                if !icp_rates_e8s.contains_key(&day_start_seconds) {
                    missing_rates.push(MissingDailyRate {
                        day_start_seconds,
                        pair: DailyRatePair::IcpToUsd,
                    });
                }
                if is_in_fiat_delay_window(day_start_seconds, now_seconds) {
                    continue;
                }
                for &symbol in fiat_symbols {
                    let is_missing = to_fiat_symbol_bytes(symbol).is_some_and(|symbol_bytes| {
                        !fiat_rates_e8s.contains_key(&(symbol_bytes, day_start_seconds))
                    });
                    if is_missing {
                        missing_rates.push(MissingDailyRate {
                            day_start_seconds,
                            pair: DailyRatePair::UsdToFiat(symbol),
                        });
                    }
                }
            }
            missing_rates
        })
    });

    FAILED_FETCHES.with(|failed_fetches| {
        let failed_fetches = failed_fetches.borrow();
        missing_rates
            .into_iter()
            .filter(|missing_rate| {
                failed_fetches.get(missing_rate).is_none_or(|failed| {
                    failed
                        .last_failed_seconds
                        .saturating_add(get_retry_delay_seconds(failed.count))
                        <= now_seconds
                })
            })
            .collect()
    })
}

/// Stores the non-final USD/fiat rate of the day that starts at `day_start_seconds`.
/// It replaces the previous non-final rate of the day.
pub fn add_non_final_fiat_rate(symbol: &str, day_start_seconds: u64, rate_e8s: u64) {
    set_non_final_fiat_rate(symbol, day_start_seconds, Some(rate_e8s));
}

/// Records one failed fetch of a non-final USD/fiat rate. The previous non-final rate stays.
pub fn record_failed_non_final_fetch(symbol: &str, day_start_seconds: u64) {
    set_non_final_fiat_rate(symbol, day_start_seconds, None);
}

/// Returns the day start and symbol of each non-final USD/fiat rate to fetch.
/// These are the days in the last `FIAT_RATE_DELAY_SECS`, from today back, but not before
/// `FIRST_DAY_START_SECONDS`. In one day, the symbols come in the order of `fiat_symbols`.
/// A rate that has a final rate, or that was fetched in the last `NON_FINAL_REFETCH_DELAY_SECS`,
/// is not listed.
pub fn list_non_final_fiat_rates_to_fetch(
    fiat_symbols: &[&'static str],
) -> Vec<(u64, &'static str)> {
    let now_seconds = time_seconds();
    let newest_day_start_seconds = get_day_start_seconds(now_seconds);

    USD_TO_FIAT_RATES_E8S.with(|final_rates_e8s| {
        NON_FINAL_USD_TO_FIAT_RATES.with(|non_final_rates| {
            let final_rates_e8s = final_rates_e8s.borrow();
            let non_final_rates = non_final_rates.borrow();
            let mut rates_to_fetch = vec![];
            let mut day_start_seconds = newest_day_start_seconds;
            while day_start_seconds >= FIRST_DAY_START_SECONDS
                && is_in_fiat_delay_window(day_start_seconds, now_seconds)
            {
                for &symbol in fiat_symbols {
                    let Some(symbol_bytes) = to_fiat_symbol_bytes(symbol) else {
                        continue;
                    };
                    let key = (symbol_bytes, day_start_seconds);
                    let is_due = !final_rates_e8s.contains_key(&key)
                        && non_final_rates.get(&key).is_none_or(|rate| {
                            rate.last_fetch_seconds
                                .saturating_add(NON_FINAL_REFETCH_DELAY_SECS)
                                <= now_seconds
                        });
                    if is_due {
                        rates_to_fetch.push((day_start_seconds, symbol));
                    }
                }
                let Some(previous_day_start_seconds) = day_start_seconds.checked_sub(ONE_DAY_SECS)
                else {
                    break;
                };
                day_start_seconds = previous_day_start_seconds;
            }
            rates_to_fetch
        })
    })
}

/// Removes each non-final USD/fiat rate whose day left the delay window or that has a final
/// rate now.
pub fn remove_outdated_non_final_fiat_rates() {
    let now_seconds = time_seconds();
    USD_TO_FIAT_RATES_E8S.with(|final_rates_e8s| {
        let final_rates_e8s = final_rates_e8s.borrow();
        NON_FINAL_USD_TO_FIAT_RATES.with(|non_final_rates| {
            non_final_rates
                .borrow_mut()
                .retain(|&(symbol_bytes, day_start_seconds), _| {
                    is_in_fiat_delay_window(day_start_seconds, now_seconds)
                        && !final_rates_e8s.contains_key(&(symbol_bytes, day_start_seconds))
                });
        });
    });
}

/// Sets the time of the last fetch of a non-final USD/fiat rate to now.
/// With a `rate_e8s`, it replaces the rate. With `None`, the previous rate stays.
fn set_non_final_fiat_rate(symbol: &str, day_start_seconds: u64, rate_e8s: Option<u64>) {
    let Some(symbol_bytes) = to_fiat_symbol_bytes(symbol) else {
        ic_cdk::println!("Failed to store the non-final daily {symbol} rate: invalid symbol");
        return;
    };
    let now_seconds = time_seconds();
    NON_FINAL_USD_TO_FIAT_RATES.with(|non_final_rates| {
        let mut non_final_rates = non_final_rates.borrow_mut();
        let non_final_rate = non_final_rates
            .entry((symbol_bytes, day_start_seconds))
            .or_insert(NonFinalFiatRate {
                rate_e8s: None,
                last_fetch_seconds: now_seconds,
            });
        non_final_rate.last_fetch_seconds = now_seconds;
        if rate_e8s.is_some() {
            non_final_rate.rate_e8s = rate_e8s;
        }
    });
}

/// Returns `true` if the day started less than `FIAT_RATE_DELAY_SECS` before `now_seconds`, so
/// the XRC can still change its USD/fiat rates.
fn is_in_fiat_delay_window(day_start_seconds: u64, now_seconds: u64) -> bool {
    day_start_seconds.saturating_add(FIAT_RATE_DELAY_SECS) > now_seconds
}

/// Returns `FETCH_RETRY_DELAY_SECS`, doubled for each failed fetch after the first one, up to
/// `MAX_FETCH_RETRY_DELAY_SECS`.
pub(super) fn get_retry_delay_seconds(failed_count: u8) -> u64 {
    let doublings = u32::from(failed_count.saturating_sub(1)).min(u64::BITS - 1);
    FETCH_RETRY_DELAY_SECS
        .saturating_mul(1 << doublings)
        .min(MAX_FETCH_RETRY_DELAY_SECS)
}

fn empty_daily_rate(day_start_seconds: u64) -> DailyRate {
    DailyRate {
        timestamp_seconds: day_start_seconds,
        icp_to_usd_e8s: None,
        usd_to_fiat_e8s: None,
        usd_to_fiat_is_final: false,
    }
}

fn to_fiat_symbol_bytes(symbol: &str) -> Option<FiatSymbolBytes> {
    symbol.as_bytes().try_into().ok()
}

fn get_day_start_seconds(timestamp_seconds: u64) -> u64 {
    timestamp_seconds.saturating_sub(timestamp_seconds % ONE_DAY_SECS)
}
