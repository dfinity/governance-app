pub mod cache;
mod time;
pub mod xrc_client;

#[cfg(test)]
mod tests;

use std::time::Duration;

use cache::{CachedRate, IcpExchangeRateResponse};
use xrc_client::{Asset, AssetClass, GetExchangeRateRequest};

const UPDATE_INTERVAL: Duration = Duration::from_secs(300); // 5 minutes
const ONE_DAY_SECS: u64 = 86_400;
const ONE_HOUR_SECS: u64 = 3_600;
/// The history includes the one-day-ago rate only if it is at most this much older than one day.
/// Two intervals allow for one failed update.
const ONE_DAY_AGO_TOLERANCE_SECS: u64 = 2 * UPDATE_INTERVAL.as_secs();
/// The update timer adds the current and one-day-ago rates, so the backfill covers the hours in between.
const BACKFILL_HOURS: u64 = 23;

/// Called from `init` and `post_upgrade` to kick off periodic exchange-rate fetching.
pub fn init_exchange_rate_timer() {
    ic_cdk_timers::set_timer(Duration::ZERO, async {
        update_exchange_rate().await;
        // The history lives on the heap, so it is empty after `init` and `post_upgrade`.
        backfill_rate_history().await;
    });
    ic_cdk_timers::set_timer_interval(UPDATE_INTERVAL, || update_exchange_rate());
}

pub fn get_icp_to_usd_exchange_rate() -> IcpExchangeRateResponse {
    cache::get_cached_rates()
}

pub fn get_icp_to_usd_rate_history() -> Vec<CachedRate> {
    cache::list_past_day_rates()
}

#[cfg(feature = "testnet")]
pub fn set_mock_exchange_rate(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    cache::set_mock_rates(current_rate_e8s, rate_one_day_ago_e8s);
}

fn icp_asset() -> Asset {
    Asset {
        symbol: "ICP".to_string(),
        class: AssetClass::Cryptocurrency,
    }
}

fn usd_asset() -> Asset {
    Asset {
        symbol: "USD".to_string(),
        class: AssetClass::FiatCurrency,
    }
}

async fn update_exchange_rate() {
    let past_timestamp = time::time_seconds().saturating_sub(ONE_DAY_SECS);

    // A `None` needs no log here, because `fetch_rate` logs the reason.

    // No timestamp = latest available rate from XRC.
    // https://github.com/dfinity/exchange-rate-canister/blob/41393865715eecb620474de34351096ec77a13fa/src/xrc/src/api.rs#L369
    if let Some(rate) = fetch_rate(icp_asset(), usd_asset(), None, "current").await {
        cache::set_current_rate(rate);
    }
    let one_day_ago_rate = fetch_rate(
        icp_asset(),
        usd_asset(),
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
        if let Some(rate) = fetch_rate(icp_asset(), usd_asset(), Some(timestamp), "history").await {
            cache::add_history_rate(rate);
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
