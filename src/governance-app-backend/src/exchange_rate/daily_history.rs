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
/// rate yet, the XRC returns the rate of an earlier day. Thus the history fetches the USD/fiat
/// rate of a day only when the day started at least this long ago, and keeps that rate.
pub(super) const FIAT_RATE_DELAY_SECS: u64 = 3 * ONE_DAY_SECS;

/// After this many failed fetches, a rate is not listed as missing until the next upgrade.
/// Each fetch costs cycles, so this limits the cost of a rate that the XRC cannot give.
pub(super) const MAX_FETCH_ATTEMPTS: u8 = 3;

/// An ISO 4217 currency code, e.g. "EUR".
type FiatSymbolBytes = [u8; 3];

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

    /// The number of failed fetches of each missing rate.
    /// It lives on the heap, so an upgrade clears it.
    static FAILED_FETCH_COUNTS: RefCell<BTreeMap<MissingDailyRate, u8>> = RefCell::default();
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
                rates_by_day
                    .entry(day_start_seconds)
                    .or_insert_with(|| empty_daily_rate(day_start_seconds))
                    .usd_to_fiat_e8s = Some(entry.value());
            }
        });
    }

    rates_by_day.into_values().collect()
}

/// Records one failed fetch of `missing_rate`.
pub fn record_failed_fetch(missing_rate: MissingDailyRate) {
    FAILED_FETCH_COUNTS.with(|counts| {
        let mut counts = counts.borrow_mut();
        let count = counts.entry(missing_rate).or_default();
        *count = count.saturating_add(1);
    });
}

/// Returns each rate that the history misses, from today back to `FIRST_DAY_START_SECONDS`.
/// The newest day comes first. In one day, ICP/USD comes first, then `fiat_symbols` in order.
/// The USD/fiat rates of the days in the last `FIAT_RATE_DELAY_SECS` are not listed.
/// A rate that failed to fetch `MAX_FETCH_ATTEMPTS` times is not listed.
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
                if day_start_seconds.saturating_add(FIAT_RATE_DELAY_SECS) > now_seconds {
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

    FAILED_FETCH_COUNTS.with(|counts| {
        let counts = counts.borrow();
        missing_rates
            .into_iter()
            .filter(|missing_rate| {
                counts.get(missing_rate).copied().unwrap_or_default() < MAX_FETCH_ATTEMPTS
            })
            .collect()
    })
}

fn empty_daily_rate(day_start_seconds: u64) -> DailyRate {
    DailyRate {
        timestamp_seconds: day_start_seconds,
        icp_to_usd_e8s: None,
        usd_to_fiat_e8s: None,
    }
}

fn to_fiat_symbol_bytes(symbol: &str) -> Option<FiatSymbolBytes> {
    symbol.as_bytes().try_into().ok()
}

fn get_day_start_seconds(timestamp_seconds: u64) -> u64 {
    timestamp_seconds.saturating_sub(timestamp_seconds % ONE_DAY_SECS)
}
