pub mod cache;
mod time;
pub mod xrc_client;

#[cfg(test)]
mod tests;

use cache::{CachedRate, IcpExchangeRateResponse};
use xrc_client::{Asset, AssetClass, GetExchangeRateRequest};

const UPDATE_INTERVAL_NANOS: u64 = 300 * NANOS_PER_SEC; // 5 minutes
const XRC_MARGIN_SECS: u64 = 300;
const TWENTY_FOUR_HOURS_SECS: u64 = 86_400;
const NANOS_PER_SEC: u64 = 1_000_000_000;

/// Called from `init` and `post_upgrade` to schedule the first timer tick immediately.
pub fn init_exchange_rate_timer() {
    reschedule_now();
}

/// Global timer entry point. Called by the `canister_global_timer` export in lib.rs.
pub fn on_timer() {
    ic_cdk::futures::spawn(update_exchange_rate());
    reschedule_after_interval();
}

fn reschedule_now() {
    ic_cdk::api::global_timer_set(ic_cdk::api::time());
}

fn reschedule_after_interval() {
    ic_cdk::api::global_timer_set(ic_cdk::api::time() + UPDATE_INTERVAL_NANOS);
}

pub fn get_icp_exchange_rate() -> IcpExchangeRateResponse {
    cache::get_cached_rates()
}

#[cfg(feature = "testnet")]
pub fn set_mock_exchange_rate(current_rate_e8s: u64, rate_24h_ago_e8s: u64) {
    cache::set_mock_rates(current_rate_e8s, rate_24h_ago_e8s);
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
    let now_secs = time::time_nanos() / NANOS_PER_SEC;
    let current_timestamp = now_secs.saturating_sub(XRC_MARGIN_SECS);
    let past_timestamp = now_secs
        .saturating_sub(TWENTY_FOUR_HOURS_SECS)
        .saturating_sub(XRC_MARGIN_SECS);

    fetch_and_cache_rate(current_timestamp, RateKind::Current).await;
    fetch_and_cache_rate(past_timestamp, RateKind::TwentyFourHoursAgo).await;
}

enum RateKind {
    Current,
    TwentyFourHoursAgo,
}

async fn fetch_and_cache_rate(timestamp_seconds: u64, kind: RateKind) {
    let request = GetExchangeRateRequest {
        base_asset: icp_asset(),
        quote_asset: usd_asset(),
        timestamp: Some(timestamp_seconds),
    };

    let label = match kind {
        RateKind::Current => "current",
        RateKind::TwentyFourHoursAgo => "24h-ago",
    };

    let result = xrc_client::get_exchange_rate(request).await;
    match result {
        Ok(Ok(exchange_rate)) => {
            let rate_e8s = convert_to_e8s(exchange_rate.rate, exchange_rate.metadata.decimals);
            let now_secs = time::time_nanos() / NANOS_PER_SEC;
            let cached = CachedRate {
                rate_e8s,
                timestamp_seconds: exchange_rate.timestamp,
                updated_at_seconds: now_secs,
            };
            match kind {
                RateKind::Current => cache::set_current_rate(cached),
                RateKind::TwentyFourHoursAgo => cache::set_24h_rate(cached),
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

fn convert_to_e8s(amount: u64, decimals: u32) -> u64 {
    if decimals >= 8 {
        amount / 10u64.pow(decimals - 8)
    } else {
        amount * 10u64.pow(8 - decimals)
    }
}
