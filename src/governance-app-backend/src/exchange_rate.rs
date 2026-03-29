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

/// Called from `init` and `post_upgrade` to kick off periodic exchange-rate fetching.
pub fn init_exchange_rate_timer() {
    ic_cdk_timers::set_timer(Duration::ZERO, update_exchange_rate());
    ic_cdk_timers::set_timer_interval(UPDATE_INTERVAL, || update_exchange_rate());
}

pub fn get_icp_to_usd_exchange_rate() -> IcpExchangeRateResponse {
    cache::get_cached_rates()
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
    let now_secs = time::time_seconds();
    let past_timestamp = now_secs.saturating_sub(ONE_DAY_SECS);

    // No timestamp = latest available rate from XRC.
    // https://github.com/dfinity/exchange-rate-canister/blob/41393865715eecb620474de34351096ec77a13fa/src/xrc/src/api.rs#L369
    fetch_and_cache_rate(None, RateKind::Current).await;
    fetch_and_cache_rate(Some(past_timestamp), RateKind::OneDayAgo).await;
}

enum RateKind {
    Current,
    OneDayAgo,
}

async fn fetch_and_cache_rate(timestamp: Option<u64>, kind: RateKind) {
    let request = GetExchangeRateRequest {
        base_asset: icp_asset(),
        quote_asset: usd_asset(),
        timestamp,
    };

    let label = match kind {
        RateKind::Current => "current",
        RateKind::OneDayAgo => "one-day-ago",
    };

    let result = xrc_client::get_exchange_rate(request).await;
    match result {
        Ok(Ok(exchange_rate)) => {
            let Some(rate_e8s) =
                convert_to_e8s(exchange_rate.rate, exchange_rate.metadata.decimals)
            else {
                ic_cdk::println!(
                    "Keeping {} ICP/USD rate unchanged: conversion overflow (rate={}, decimals={})",
                    label,
                    exchange_rate.rate,
                    exchange_rate.metadata.decimals,
                );
                return;
            };
            let now_secs = time::time_seconds();
            let cached = CachedRate {
                rate_e8s,
                timestamp_seconds: exchange_rate.timestamp,
                updated_at_seconds: now_secs,
            };
            match kind {
                RateKind::Current => cache::set_current_rate(cached),
                RateKind::OneDayAgo => cache::set_one_day_ago_rate(cached),
            }
            ic_cdk::println!("Updated {} ICP/USD rate to {} e8s", label, rate_e8s);
        }
        Ok(Err(err)) => {
            ic_cdk::println!(
                "Keeping {} ICP/USD rate unchanged due to XRC error: {:?}",
                label,
                err
            );
        }
        Err(call_err) => {
            ic_cdk::println!(
                "Keeping {} ICP/USD rate unchanged due to call error: {}",
                label,
                call_err
            );
        }
    }
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
