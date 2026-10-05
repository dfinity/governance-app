use super::cache::{get_cached_fiat_rates, get_cached_rates, CachedRate};
use super::time::testing::set_time_seconds;
use super::xrc_client::testing;
use super::*;
use ic_xrc_types::{Asset, AssetClass, ExchangeRate, ExchangeRateError, ExchangeRateMetadata};

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
    make_pair_exchange_rate(icp(), usd(), rate, decimals, timestamp)
}

fn make_fiat_exchange_rate(symbol: &str, rate: u64, timestamp: u64) -> ExchangeRate {
    make_pair_exchange_rate(usd(), fiat_asset(symbol), rate, 9, timestamp)
}

fn make_pair_exchange_rate(
    base_asset: Asset,
    quote_asset: Asset,
    rate: u64,
    decimals: u32,
    timestamp: u64,
) -> ExchangeRate {
    ExchangeRate {
        base_asset,
        quote_asset,
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
    assert_eq!(convert_to_e8s(10, 0), Some(1_000_000_000));
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
    assert_eq!(rates.one_day_ago, None);
}

#[tokio::test]
async fn test_update_exchange_rate_success() {
    set_time_seconds(100_000);

    let past_ts = 100_000 - ONE_DAY_SECS;

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
        rates.one_day_ago,
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
    set_time_seconds(200_000);

    let past_ts = 200_000 - ONE_DAY_SECS;

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
        rates.one_day_ago.is_some(),
        "one-day-ago rate should be preserved after error"
    );
}

#[test]
fn test_fiat_cache_starts_empty() {
    let rates = get_cached_fiat_rates();
    let symbols: Vec<&str> = rates.iter().map(|r| r.symbol.as_str()).collect();
    assert_eq!(symbols, FIAT_SYMBOLS);
    for rate in rates {
        assert_eq!(rate.current, None);
        assert_eq!(rate.one_day_ago, None);
    }
}

#[tokio::test]
async fn test_update_fiat_exchange_rates_success() {
    set_time_seconds(300_000);

    let past_ts = 300_000 - ONE_DAY_SECS;

    for (i, symbol) in FIAT_SYMBOLS.iter().enumerate() {
        let i = i as u64;
        testing::add_exchange_rate_response(Ok(Ok(make_fiat_exchange_rate(
            symbol,
            (i + 1) * 1_000_000_000,
            259_200,
        ))));
        testing::add_exchange_rate_response(Ok(Ok(make_fiat_exchange_rate(
            symbol,
            (i + 1) * 900_000_000,
            172_800,
        ))));
    }

    update_fiat_exchange_rates().await;

    let rates = get_cached_fiat_rates();
    assert_eq!(rates.len(), FIAT_SYMBOLS.len());
    for (i, rate) in rates.iter().enumerate() {
        let i = i as u64;
        assert_eq!(rate.symbol, FIAT_SYMBOLS[i as usize]);
        assert_eq!(
            rate.current,
            Some(CachedRate {
                rate_e8s: (i + 1) * 100_000_000,
                timestamp_seconds: 259_200,
                updated_at_seconds: 300_000,
            })
        );
        assert_eq!(
            rate.one_day_ago,
            Some(CachedRate {
                rate_e8s: (i + 1) * 90_000_000,
                timestamp_seconds: 172_800,
                updated_at_seconds: 300_000,
            })
        );
    }

    let requests = testing::drain_requests();
    assert_eq!(requests.len(), FIAT_SYMBOLS.len() * 2);
    for (i, symbol) in FIAT_SYMBOLS.iter().enumerate() {
        let current = &requests[i * 2];
        let past = &requests[i * 2 + 1];
        assert_eq!(current.base_asset, usd());
        assert_eq!(current.quote_asset, fiat_asset(symbol));
        assert_eq!(current.timestamp, None);
        assert_eq!(past.base_asset, usd());
        assert_eq!(past.quote_asset, fiat_asset(symbol));
        assert_eq!(past.timestamp, Some(past_ts));
    }
}

#[tokio::test]
async fn test_update_fiat_exchange_rates_error_keeps_other_rates() {
    set_time_seconds(400_000);

    for symbol in FIAT_SYMBOLS {
        testing::add_exchange_rate_response(Ok(Ok(make_fiat_exchange_rate(
            symbol,
            1_000_000_000,
            399_000,
        ))));
        testing::add_exchange_rate_response(Ok(Ok(make_fiat_exchange_rate(
            symbol,
            900_000_000,
            313_000,
        ))));
    }
    update_fiat_exchange_rates().await;

    // The first currency fails, the other currencies get new rates.
    set_time_seconds(500_000);
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    testing::add_exchange_rate_response(Ok(Err(ExchangeRateError::ForexInvalidTimestamp)));
    for symbol in &FIAT_SYMBOLS[1..] {
        testing::add_exchange_rate_response(Ok(Ok(make_fiat_exchange_rate(
            symbol,
            2_000_000_000,
            499_000,
        ))));
        testing::add_exchange_rate_response(Ok(Ok(make_fiat_exchange_rate(
            symbol,
            1_900_000_000,
            413_000,
        ))));
    }
    update_fiat_exchange_rates().await;

    let rates = get_cached_fiat_rates();
    let first = &rates[0];
    assert_eq!(first.current.as_ref().unwrap().rate_e8s, 100_000_000);
    assert_eq!(first.current.as_ref().unwrap().updated_at_seconds, 400_000);
    assert_eq!(first.one_day_ago.as_ref().unwrap().rate_e8s, 90_000_000);
    for rate in &rates[1..] {
        assert_eq!(rate.current.as_ref().unwrap().rate_e8s, 200_000_000);
        assert_eq!(rate.one_day_ago.as_ref().unwrap().rate_e8s, 190_000_000);
    }
}

#[tokio::test]
async fn test_update_exchange_rate_does_not_touch_fiat_rates() {
    set_time_seconds(600_000);

    testing::add_exchange_rate_response(Ok(Ok(make_exchange_rate(12_345_000_000, 10, 599_990))));
    testing::add_exchange_rate_response(Ok(Ok(make_exchange_rate(11_000_000_000, 10, 513_600))));
    update_exchange_rate().await;

    assert!(get_cached_rates().current.is_some());
    for rate in get_cached_fiat_rates() {
        assert_eq!(rate.current, None);
        assert_eq!(rate.one_day_ago, None);
    }
}
