pub mod cache;
pub mod daily_history;
pub mod month_history;
mod time;
pub mod xrc_client;

#[cfg(test)]
mod tests;

use std::cell::Cell;
use std::time::Duration;

use cache::{CachedRate, FiatExchangeRate, IcpExchangeRateResponse};
use candid::CandidType;
use daily_history::{DailyRate, DailyRatePair, MissingDailyRate};
use month_history::PastMonthRate;
use serde::Deserialize;
use xrc_client::{Asset, AssetClass, GetExchangeRateRequest};

const UPDATE_INTERVAL: Duration = Duration::from_secs(300); // 5 minutes
/// The XRC moves to a new daily forex rate at no fixed time.
/// An hourly check keeps the cached fiat rates at most one hour behind the XRC.
const FIAT_UPDATE_INTERVAL: Duration = Duration::from_secs(ONE_HOUR_SECS);
/// How often the canister tries again to fetch the rates that the month history misses.
const MONTH_HISTORY_GAP_FILL_INTERVAL: Duration = Duration::from_secs(ONE_DAY_SECS);
/// How often the canister tries again to fetch the rates that the daily history misses.
/// The XRC can have no forex rate yet for today, so the canister checks more than once a day.
const DAILY_HISTORY_GAP_FILL_INTERVAL: Duration = Duration::from_secs(6 * ONE_HOUR_SECS);
/// The most rates that one daily history batch fetches.
/// A batch keeps a call context open, so a small batch lets a canister stop in minutes.
const DAILY_HISTORY_BATCH_SIZE: usize = 20;
const ONE_DAY_SECS: u64 = 86_400;
const ONE_HOUR_SECS: u64 = 3_600;
/// The history includes the one-day-ago rate only if it is at most this much older than one day.
/// Two intervals allow for one failed update.
const ONE_DAY_AGO_TOLERANCE_SECS: u64 = 2 * UPDATE_INTERVAL.as_secs();
/// The update timer adds the current and one-day-ago rates, so the backfill covers the hours in between.
const BACKFILL_HOURS: u64 = 23;

/// Fiat currencies with a cached USD exchange rate.
const SUPPORTED_FIAT_SYMBOLS: [&str; 7] = ["EUR", "GBP", "CHF", "JPY", "CNY", "CAD", "AUD"];

thread_local! {
    static IS_FILLING_DAILY_HISTORY: Cell<bool> = const { Cell::new(false) };
}

/// The days of the daily rates to list.
#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct ListDailyExchangeRatesRequest {
    /// The list includes each day whose 00:00 UTC is at or after this time.
    pub from_timestamp_seconds: u64,
    /// The list includes each day whose 00:00 UTC is before this time.
    pub to_timestamp_seconds: u64,
    /// An ISO 4217 code from `SUPPORTED_FIAT_SYMBOLS`, e.g. "EUR".
    /// Without it, the list has only the ICP/USD rates.
    pub fiat_symbol: Option<String>,
}

#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub enum ListDailyExchangeRatesResponse {
    Ok(Vec<DailyRate>),
    UnsupportedFiatSymbol { symbol: String },
}

/// Called from `init` and `post_upgrade` to kick off periodic exchange-rate fetching.
pub fn init_exchange_rate_timer() {
    ic_cdk_timers::set_timer(Duration::ZERO, async {
        update_icp_to_usd_exchange_rate().await;
        // The history lives on the heap, so it is empty after `init` and `post_upgrade`.
        backfill_rate_history().await;
        fill_month_history_gaps().await;
        fill_daily_history_gaps().await;
    });
    ic_cdk_timers::set_timer_interval(UPDATE_INTERVAL, update_icp_to_usd_exchange_rate);
    ic_cdk_timers::set_timer_interval(MONTH_HISTORY_GAP_FILL_INTERVAL, fill_month_history_gaps);
    ic_cdk_timers::set_timer_interval(DAILY_HISTORY_GAP_FILL_INTERVAL, fill_daily_history_gaps);
    ic_cdk_timers::set_timer(Duration::ZERO, update_fiat_exchange_rates());
    ic_cdk_timers::set_timer_interval(FIAT_UPDATE_INTERVAL, update_fiat_exchange_rates);
}

pub fn get_icp_to_usd_exchange_rate() -> IcpExchangeRateResponse {
    cache::get_cached_rates()
}

pub fn get_icp_to_usd_rate_history() -> Vec<CachedRate> {
    cache::list_past_day_rates()
}

pub fn list_icp_to_usd_past_month_rates() -> Vec<PastMonthRate> {
    month_history::list_past_month_rates()
}

pub fn list_usd_to_fiat_exchange_rates() -> Vec<FiatExchangeRate> {
    cache::list_cached_fiat_rates()
}

pub fn list_daily_exchange_rates(
    request: ListDailyExchangeRatesRequest,
) -> ListDailyExchangeRatesResponse {
    let ListDailyExchangeRatesRequest {
        from_timestamp_seconds,
        to_timestamp_seconds,
        fiat_symbol,
    } = request;

    if let Some(symbol) = &fiat_symbol {
        if !SUPPORTED_FIAT_SYMBOLS.contains(&symbol.as_str()) {
            return ListDailyExchangeRatesResponse::UnsupportedFiatSymbol {
                symbol: symbol.clone(),
            };
        }
    }

    ListDailyExchangeRatesResponse::Ok(daily_history::list_rates(
        from_timestamp_seconds,
        to_timestamp_seconds,
        fiat_symbol.as_deref(),
    ))
}

#[cfg(feature = "testnet")]
pub fn set_mock_exchange_rate(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    cache::set_mock_rates(current_rate_e8s, rate_one_day_ago_e8s);
}

#[cfg(feature = "testnet")]
pub fn set_mock_fiat_exchange_rate(symbol: String, rate_e8s: u64) {
    let Some(&symbol) = SUPPORTED_FIAT_SYMBOLS.iter().find(|&&s| s == symbol) else {
        ic_cdk::trap(format!("Unsupported fiat symbol: {symbol}"));
    };
    cache::set_mock_fiat_rate(symbol, rate_e8s);
}

fn icp_asset() -> Asset {
    Asset {
        symbol: "ICP".to_string(),
        class: AssetClass::Cryptocurrency,
    }
}

fn fiat_asset(symbol: &str) -> Asset {
    Asset {
        symbol: symbol.to_string(),
        class: AssetClass::FiatCurrency,
    }
}

async fn update_icp_to_usd_exchange_rate() {
    let past_timestamp = time::time_seconds().saturating_sub(ONE_DAY_SECS);

    // A `None` needs no log here, because `fetch_rate` logs the reason.

    // No timestamp = latest available rate from XRC.
    // https://github.com/dfinity/exchange-rate-canister/blob/41393865715eecb620474de34351096ec77a13fa/src/xrc/src/api.rs#L369
    if let Some(rate) = fetch_rate(icp_asset(), fiat_asset("USD"), None, "current").await {
        month_history::add_rate(&rate);
        cache::set_current_rate(rate);
    }
    let one_day_ago_rate = fetch_rate(
        icp_asset(),
        fiat_asset("USD"),
        Some(past_timestamp),
        "one-day-ago",
    )
    .await;

    if let Some(rate) = one_day_ago_rate {
        cache::set_one_day_ago_rate(rate);
    }
}

/// Fetches one rate per hour for the last day.
/// A failed call is not retried. It leaves a one-hour gap, and the 5-minute updates replace
/// the backfill rates within one day.
async fn backfill_rate_history() {
    let now_secs = time::time_seconds();
    for hours_ago in 1..=BACKFILL_HOURS {
        let timestamp = now_secs.saturating_sub(hours_ago * ONE_HOUR_SECS);
        // A `None` needs no log here, because `fetch_rate` logs the reason.
        let history_rate =
            fetch_rate(icp_asset(), fiat_asset("USD"), Some(timestamp), "history").await;
        if let Some(rate) = history_rate {
            cache::add_history_rate(rate);
        }
    }
}

/// Fetches the rate of each slot that the month history misses, newest first.
/// A failed call is not retried here. Its slot stays missing, so the next run fetches it.
async fn fill_month_history_gaps() {
    for slot_start_seconds in month_history::list_missing_slot_starts_seconds() {
        // A `None` needs no log here, because `fetch_rate` logs the reason.
        let month_history_rate = fetch_rate(
            icp_asset(),
            fiat_asset("USD"),
            Some(slot_start_seconds),
            "month-history",
        )
        .await;

        if let Some(rate) = month_history_rate {
            month_history::add_rate(&rate);
        }
    }
}

/// Fetches the rates that the daily history misses, one batch for each timer run.
/// The first fill fetches the rates of each day since 1 January 2025, so it takes many batches.
async fn fill_daily_history_gaps() {
    if fill_daily_history_batch().await {
        ic_cdk_timers::set_timer(Duration::ZERO, fill_daily_history_gaps());
    }
}

/// One rate that a daily history batch fetches.
#[derive(Clone, Copy, Debug)]
enum DailyHistoryFetch {
    /// A final rate that the history misses.
    Missing(MissingDailyRate),
    /// The non-final USD/fiat rate of a day in the delay window.
    NonFinal {
        day_start_seconds: u64,
        symbol: &'static str,
    },
}

/// Fetches up to `DAILY_HISTORY_BATCH_SIZE` rates for the daily history.
/// The non-final USD/fiat rates of the days in the delay window come first. A failed fetch of
/// such a rate keeps the previous rate, and the next run tries again.
/// Then come the rates that the history misses, newest day first. A failed fetch of a missing
/// rate is tried again after a retry delay, which doubles after each failure.
/// A batch that starts while another batch is in progress returns at once.
/// Returns `true` if the batch was full and stored a rate or fetched a non-final rate, so that
/// the next batch can start at once. A non-final rate is not fetched again in the same run, so
/// failed non-final fetches do not block the missing rates. A batch of failed missing rates
/// leaves the next try to the next interval.
async fn fill_daily_history_batch() -> bool {
    let Some(_guard) = DailyHistoryFillGuard::acquire() else {
        return false;
    };

    daily_history::remove_outdated_non_final_fiat_rates();
    let non_final_fetches =
        daily_history::list_non_final_fiat_rates_to_fetch(&SUPPORTED_FIAT_SYMBOLS)
            .into_iter()
            .map(|(day_start_seconds, symbol)| DailyHistoryFetch::NonFinal {
                day_start_seconds,
                symbol,
            });
    let missing_fetches = daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS)
        .into_iter()
        .map(DailyHistoryFetch::Missing);
    let batch = non_final_fetches
        .chain(missing_fetches)
        .take(DAILY_HISTORY_BATCH_SIZE)
        .collect::<Vec<_>>();
    let mut stored_count = 0;

    for fetch in &batch {
        let (pair, day_start_seconds) = match *fetch {
            DailyHistoryFetch::Missing(missing_rate) => {
                (missing_rate.pair, missing_rate.day_start_seconds)
            }
            DailyHistoryFetch::NonFinal {
                day_start_seconds,
                symbol,
            } => (DailyRatePair::UsdToFiat(symbol), day_start_seconds),
        };
        let (base_asset, quote_asset) = match pair {
            DailyRatePair::IcpToUsd => (icp_asset(), fiat_asset("USD")),
            DailyRatePair::UsdToFiat(symbol) => (fiat_asset("USD"), fiat_asset(symbol)),
        };

        // A `None` needs no log here, because `fetch_rate` logs the reason.
        let daily_rate = fetch_rate(
            base_asset,
            quote_asset,
            Some(day_start_seconds),
            "daily-history",
        )
        .await;

        match (*fetch, daily_rate) {
            (DailyHistoryFetch::Missing(missing_rate), Some(rate)) => {
                daily_history::add_rate(
                    missing_rate.pair,
                    missing_rate.day_start_seconds,
                    rate.rate_e8s,
                );
                stored_count += 1;
            }
            (DailyHistoryFetch::Missing(missing_rate), None) => {
                daily_history::record_failed_fetch(missing_rate)
            }
            (
                DailyHistoryFetch::NonFinal {
                    day_start_seconds,
                    symbol,
                },
                Some(rate),
            ) => {
                daily_history::add_non_final_fiat_rate(symbol, day_start_seconds, rate.rate_e8s);
                stored_count += 1;
            }
            (
                DailyHistoryFetch::NonFinal {
                    day_start_seconds,
                    symbol,
                },
                None,
            ) => daily_history::record_failed_non_final_fetch(symbol, day_start_seconds),
        }
    }

    let fetched_non_final = batch
        .iter()
        .any(|fetch| matches!(fetch, DailyHistoryFetch::NonFinal { .. }));
    batch.len() == DAILY_HISTORY_BATCH_SIZE && (stored_count > 0 || fetched_non_final)
}

/// Marks a daily history fill as in progress, until the guard is dropped.
struct DailyHistoryFillGuard;

impl DailyHistoryFillGuard {
    /// Returns `None` if another fill is in progress.
    fn acquire() -> Option<Self> {
        let was_filling = IS_FILLING_DAILY_HISTORY.with(|is_filling| is_filling.replace(true));
        if was_filling {
            None
        } else {
            Some(Self)
        }
    }
}

impl Drop for DailyHistoryFillGuard {
    fn drop(&mut self) {
        IS_FILLING_DAILY_HISTORY.with(|is_filling| is_filling.set(false));
    }
}

/// Fetches the USD rate of each currency in `SUPPORTED_FIAT_SYMBOLS` and caches it.
/// A failed call keeps the previous rate. The next timer run tries again.
async fn update_fiat_exchange_rates() {
    for symbol in SUPPORTED_FIAT_SYMBOLS {
        // No timestamp = latest available rate from XRC.
        // A `None` needs no log here, because `fetch_rate` logs the reason.
        let fiat_rate = fetch_rate(fiat_asset("USD"), fiat_asset(symbol), None, "current").await;
        if let Some(rate) = fiat_rate {
            cache::set_fiat_rate(symbol, rate);
        }
    }
}

/// Fetches a rate from the XRC. Returns `None` and logs the reason if the call or the conversion fails.
async fn fetch_rate(
    base_asset: Asset,
    quote_asset: Asset,
    timestamp: Option<u64>,
    label: &str,
) -> Option<CachedRate> {
    let request = GetExchangeRateRequest {
        base_asset,
        quote_asset,
        timestamp,
    };

    let pair = format!(
        "{}/{}",
        request.base_asset.symbol, request.quote_asset.symbol
    );

    let exchange_rate = match xrc_client::get_exchange_rate(request).await {
        Ok(Ok(exchange_rate)) => exchange_rate,

        // The other cases log the error and return `None`.
        Ok(Err(err)) => {
            ic_cdk::println!(
                "Failed to fetch {} {} rate: XRC error: {:?}",
                label,
                pair,
                err
            );
            return None;
        }
        Err(call_err) => {
            ic_cdk::println!(
                "Failed to fetch {} {} rate: call error: {}",
                label,
                pair,
                call_err
            );
            return None;
        }
    };

    let Some(rate_e8s) = convert_to_e8s(exchange_rate.rate, exchange_rate.metadata.decimals) else {
        ic_cdk::println!(
            "Failed to fetch {} {} rate: conversion overflow (rate={}, decimals={})",
            label,
            pair,
            exchange_rate.rate,
            exchange_rate.metadata.decimals,
        );
        return None;
    };

    ic_cdk::println!("Fetched {} {} rate: {} e8s", label, pair, rate_e8s);
    Some(CachedRate {
        rate_e8s,
        timestamp_seconds: exchange_rate.timestamp,
        updated_at_seconds: time::time_seconds(),
    })
}

/// Converts a number such that it can be interpreted as a fixed-point number
/// with 8 decimal places.
///
/// For example, if `amount` is 123 and `decimals` is 2, the input is
/// interpreted as 1.23, by moving the decimal point 2 positions to the left.
/// In the output, we want to represent this with 8 decimals instead of 2, so
/// from 1.23 we move the decimal point 8 positions to the right to get
/// `123_000_000`.
///
/// Based on https://github.com/dfinity/ic/blob/6760029ea4e9be8170984b023391cb72ff3b6398/rs/rosetta-api/tvl/src/lib.rs#L166-L174
fn convert_to_e8s(amount: u64, decimals: u32) -> Option<u64> {
    if decimals >= 8 {
        let divisor = 10u64.checked_pow(decimals - 8)?;
        Some(amount / divisor)
    } else {
        let multiplier = 10u64.checked_pow(8 - decimals)?;
        amount.checked_mul(multiplier)
    }
}
