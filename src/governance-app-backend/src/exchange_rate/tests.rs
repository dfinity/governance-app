use super::cache::{
    add_history_rate, get_cached_rates, list_past_day_rates, set_one_day_ago_rate, CachedRate,
};
use super::time::testing::set_time_seconds;
use super::xrc_client::testing;
use super::*;
use ic_xrc_types::{Asset, AssetClass, ExchangeRate, ExchangeRateMetadata};

/// Monday, September 21, 2026 at 14:13:20 UTC.
const NOW_SECONDS: u64 = 1_790_000_000;
/// With 8 decimals, the `rate` of `make_exchange_rate` is in e8s.
const E8S_DECIMALS: u32 = 8;

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
    set_time_seconds(NOW_SECONDS);

    let past_ts = NOW_SECONDS - ONE_DAY_SECS;

    let current_rate = make_exchange_rate(12_345_000_000, 10, NOW_SECONDS - 10);
    let past_rate = make_exchange_rate(11_000_000_000, 10, past_ts);

    testing::add_exchange_rate_response(Ok(Ok(current_rate)));
    testing::add_exchange_rate_response(Ok(Ok(past_rate)));

    update_exchange_rate().await;

    let rates = get_cached_rates();
    assert_eq!(
        rates.current,
        Some(CachedRate {
            rate_e8s: 123_450_000,
            timestamp_seconds: NOW_SECONDS - 10,
            updated_at_seconds: NOW_SECONDS,
        })
    );
    assert_eq!(
        rates.one_day_ago,
        Some(CachedRate {
            rate_e8s: 110_000_000,
            timestamp_seconds: past_ts,
            updated_at_seconds: NOW_SECONDS,
        })
    );

    let requests = testing::drain_requests();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0].timestamp, None);
    assert_eq!(requests[1].timestamp, Some(past_ts));

    assert_eq!(
        list_past_day_rates(),
        vec![rates.one_day_ago.unwrap(), rates.current.unwrap()]
    );
}

#[tokio::test]
async fn test_update_exchange_rate_error_preserves_cache() {
    set_time_seconds(NOW_SECONDS);

    let past_ts = NOW_SECONDS - ONE_DAY_SECS;

    let current_rate = make_exchange_rate(12_345_000_000, 10, NOW_SECONDS - 10);
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
fn test_past_day_rates_start_empty() {
    assert_eq!(list_past_day_rates(), vec![]);
}

#[tokio::test]
async fn test_backfill_rate_history() {
    set_time_seconds(NOW_SECONDS);
    let failed_hours_ago = 2;

    let mut expected = vec![];
    for hours_ago in 1..=BACKFILL_HOURS {
        let timestamp_seconds = NOW_SECONDS - hours_ago * ONE_HOUR_SECS;
        if hours_ago == failed_hours_ago {
            testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
            continue;
        }
        let rate_e8s = 300_000_000 + hours_ago * 1_000_000;
        let response = make_exchange_rate(rate_e8s, E8S_DECIMALS, timestamp_seconds);
        testing::add_exchange_rate_response(Ok(Ok(response)));
        expected.push(CachedRate {
            rate_e8s,
            timestamp_seconds,
            updated_at_seconds: NOW_SECONDS,
        });
    }

    backfill_rate_history().await;

    let request_timestamps: Vec<Option<u64>> = testing::drain_requests()
        .iter()
        .map(|request| request.timestamp)
        .collect();
    let expected_request_timestamps: Vec<Option<u64>> = (1..=BACKFILL_HOURS)
        .map(|hours_ago| Some(NOW_SECONDS - hours_ago * ONE_HOUR_SECS))
        .collect();
    assert_eq!(request_timestamps, expected_request_timestamps);

    // Oldest first, without the failed hour.
    expected.reverse();
    assert_eq!(list_past_day_rates(), expected);
}

#[test]
fn test_past_day_rates_drop_rates_older_than_one_day() {
    set_time_seconds(NOW_SECONDS);
    let old = CachedRate {
        rate_e8s: 310_000_000,
        timestamp_seconds: NOW_SECONDS - 20 * ONE_HOUR_SECS,
        updated_at_seconds: NOW_SECONDS,
    };
    let recent = CachedRate {
        rate_e8s: 320_000_000,
        timestamp_seconds: NOW_SECONDS - ONE_HOUR_SECS,
        updated_at_seconds: NOW_SECONDS,
    };
    add_history_rate(old);
    add_history_rate(recent.clone());

    // Five hours later, `old` is more than one day old.
    let later_seconds = NOW_SECONDS + 5 * ONE_HOUR_SECS;
    set_time_seconds(later_seconds);
    let newest = CachedRate {
        rate_e8s: 330_000_000,
        timestamp_seconds: later_seconds,
        updated_at_seconds: later_seconds,
    };
    add_history_rate(newest.clone());

    assert_eq!(list_past_day_rates(), vec![recent, newest]);
}

#[test]
fn test_past_day_rates_replace_rate_with_same_timestamp() {
    set_time_seconds(NOW_SECONDS);
    let first = CachedRate {
        rate_e8s: 310_000_000,
        timestamp_seconds: NOW_SECONDS,
        updated_at_seconds: NOW_SECONDS,
    };
    let second = CachedRate {
        rate_e8s: 320_000_000,
        ..first.clone()
    };
    add_history_rate(first);
    add_history_rate(second.clone());

    assert_eq!(list_past_day_rates(), vec![second]);
}

#[tokio::test]
async fn test_past_day_rates_start_with_one_day_ago_rate() {
    set_time_seconds(NOW_SECONDS);
    let one_day_ago_seconds = NOW_SECONDS - ONE_DAY_SECS;

    // The current rate of one day ago has the same timestamp as the one-day-ago rate.
    add_history_rate(CachedRate {
        rate_e8s: 340_000_000,
        timestamp_seconds: one_day_ago_seconds,
        updated_at_seconds: one_day_ago_seconds,
    });
    let backfilled = CachedRate {
        rate_e8s: 335_000_000,
        timestamp_seconds: one_day_ago_seconds + ONE_HOUR_SECS,
        updated_at_seconds: NOW_SECONDS,
    };
    add_history_rate(backfilled.clone());

    let current = make_exchange_rate(324_000_000, E8S_DECIMALS, NOW_SECONDS);
    let one_day_ago = make_exchange_rate(343_500_000, E8S_DECIMALS, one_day_ago_seconds);
    testing::add_exchange_rate_response(Ok(Ok(current)));
    testing::add_exchange_rate_response(Ok(Ok(one_day_ago)));
    update_exchange_rate().await;

    assert_eq!(
        list_past_day_rates(),
        vec![
            CachedRate {
                rate_e8s: 343_500_000,
                timestamp_seconds: one_day_ago_seconds,
                updated_at_seconds: NOW_SECONDS,
            },
            backfilled,
            CachedRate {
                rate_e8s: 324_000_000,
                timestamp_seconds: NOW_SECONDS,
                updated_at_seconds: NOW_SECONDS,
            },
        ]
    );
}

#[test]
fn test_past_day_rates_include_one_day_ago_rate_within_tolerance() {
    set_time_seconds(NOW_SECONDS);
    let one_day_ago = CachedRate {
        rate_e8s: 343_500_000,
        timestamp_seconds: NOW_SECONDS - ONE_DAY_SECS - ONE_DAY_AGO_TOLERANCE_SECS,
        updated_at_seconds: NOW_SECONDS,
    };
    let current = CachedRate {
        rate_e8s: 324_000_000,
        timestamp_seconds: NOW_SECONDS,
        updated_at_seconds: NOW_SECONDS,
    };
    set_one_day_ago_rate(one_day_ago.clone());
    add_history_rate(current.clone());

    assert_eq!(list_past_day_rates(), vec![one_day_ago, current]);
}

#[test]
fn test_past_day_rates_skip_stale_one_day_ago_rate() {
    set_time_seconds(NOW_SECONDS);
    set_one_day_ago_rate(CachedRate {
        rate_e8s: 343_500_000,
        timestamp_seconds: NOW_SECONDS - ONE_DAY_SECS - ONE_DAY_AGO_TOLERANCE_SECS - 1,
        updated_at_seconds: NOW_SECONDS,
    });
    let backfilled = CachedRate {
        rate_e8s: 335_000_000,
        timestamp_seconds: NOW_SECONDS - ONE_DAY_SECS + ONE_HOUR_SECS,
        updated_at_seconds: NOW_SECONDS,
    };
    let current = CachedRate {
        rate_e8s: 324_000_000,
        timestamp_seconds: NOW_SECONDS,
        updated_at_seconds: NOW_SECONDS,
    };
    add_history_rate(backfilled.clone());
    add_history_rate(current.clone());

    assert_eq!(list_past_day_rates(), vec![backfilled, current]);
}
