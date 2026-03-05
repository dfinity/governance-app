use super::cache::{get_cached_rates, CachedRate};
use super::time::testing::set_time_nanos;
use super::xrc_client::testing;
use super::*;
use ic_xrc_types::{Asset, AssetClass, ExchangeRate, ExchangeRateMetadata};

fn icp() -> Asset {
    Asset {
        symbol: "ICP".to_string(),
        class: AssetClass::Cryptocurrency,
    }
}

fn usd() -> Asset {
    Asset {
        symbol: "USD".to_string(),
        class: AssetClass::FiatCurrency,
    }
}

fn make_exchange_rate(rate: u64, decimals: u32, timestamp: u64) -> ExchangeRate {
    ExchangeRate {
        base_asset: icp(),
        quote_asset: usd(),
        timestamp,
        rate,
        metadata: ExchangeRateMetadata {
            decimals,
            base_asset_num_received_rates: 5,
            base_asset_num_queried_sources: 7,
            quote_asset_num_received_rates: 5,
            quote_asset_num_queried_sources: 7,
            standard_deviation: 0,
            forex_timestamp: None,
        },
    }
}

#[test]
fn test_convert_to_e8s_more_decimals() {
    assert_eq!(convert_to_e8s(1_234_567_890, 10), Some(12_345_678));
}

#[test]
fn test_convert_to_e8s_exact_8_decimals() {
    assert_eq!(convert_to_e8s(1_000_000_000, 8), Some(1_000_000_000));
}

#[test]
fn test_convert_to_e8s_fewer_decimals() {
    assert_eq!(convert_to_e8s(123, 2), Some(123_000_000));
}

#[test]
fn test_convert_to_e8s_zero_decimals() {
    assert_eq!(convert_to_e8s(10, 0), Some(10_00_000_000));
}

#[test]
fn test_convert_to_e8s_overflow_returns_none() {
    assert_eq!(convert_to_e8s(u64::MAX, 0), None);
}

#[test]
fn test_convert_to_e8s_huge_decimals_returns_none() {
    assert_eq!(convert_to_e8s(1, 128), None);
}

#[test]
fn test_cache_starts_empty() {
    let rates = get_cached_rates();
    assert_eq!(rates.current, None);
    assert_eq!(rates.twenty_four_hours_ago, None);
}

#[tokio::test]
async fn test_update_exchange_rate_success() {
    set_time_nanos(100_000 * NANOS_PER_SEC);

    let past_ts = 100_000 - TWENTY_FOUR_HOURS_SECS;

    let current_rate = make_exchange_rate(12_345_000_000, 10, 99_990);
    let past_rate = make_exchange_rate(11_000_000_000, 10, past_ts);

    testing::add_exchange_rate_response(Ok(Ok(current_rate)));
    testing::add_exchange_rate_response(Ok(Ok(past_rate)));

    update_exchange_rate().await;

    let rates = get_cached_rates();
    assert_eq!(
        rates.current,
        Some(CachedRate {
            rate_e8s: 123_450_000,
            timestamp_seconds: 99_990,
            updated_at_seconds: 100_000,
        })
    );
    assert_eq!(
        rates.twenty_four_hours_ago,
        Some(CachedRate {
            rate_e8s: 110_000_000,
            timestamp_seconds: past_ts,
            updated_at_seconds: 100_000,
        })
    );

    let requests = testing::drain_requests();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0].timestamp, None);
    assert_eq!(requests[1].timestamp, Some(past_ts));
}

#[tokio::test]
async fn test_update_exchange_rate_error_preserves_cache() {
    set_time_nanos(200_000 * NANOS_PER_SEC);

    let past_ts = 200_000 - TWENTY_FOUR_HOURS_SECS;

    let current_rate = make_exchange_rate(12_345_000_000, 10, 199_990);
    let past_rate = make_exchange_rate(11_000_000_000, 10, past_ts);
    testing::add_exchange_rate_response(Ok(Ok(current_rate)));
    testing::add_exchange_rate_response(Ok(Ok(past_rate)));
    update_exchange_rate().await;

    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    update_exchange_rate().await;

    let rates = get_cached_rates();
    assert!(
        rates.current.is_some(),
        "current rate should be preserved after error"
    );
    assert_eq!(rates.current.unwrap().rate_e8s, 123_450_000);
    assert!(
        rates.twenty_four_hours_ago.is_some(),
        "24h rate should be preserved after error"
    );
}
