use super::cache::{
    add_history_rate, get_cached_rates, list_cached_fiat_rates, list_past_day_rates,
    set_one_day_ago_rate, CachedRate,
};
use super::month_history::{
    add_rate, list_missing_slot_starts_seconds, list_past_month_rates, PastMonthRate, SLOT_SECS,
};
use super::time::testing::set_time_seconds;
use super::xrc_client::testing;
use super::*;
use ic_xrc_types::{Asset, AssetClass, ExchangeRate, ExchangeRateError, ExchangeRateMetadata};

/// Monday, September 21, 2026 at 14:13:20 UTC.
const NOW_SECONDS: u64 = 1_790_000_000;
/// The start of the two-hour slot of `NOW_SECONDS`: Monday, September 21, 2026 at 14:00:00 UTC.
const NOW_SLOT_START_SECONDS: u64 = 1_789_999_200;
/// With 8 decimals, the `rate` of `make_exchange_rate` is in e8s.
const E8S_DECIMALS: u32 = 8;
/// Metadata of an XRC rate with 8 decimals, so the `rate` is in e8s.
const E8S_RATE_METADATA: ExchangeRateMetadata = ExchangeRateMetadata {
    decimals: E8S_DECIMALS,
    base_asset_num_received_rates: 5,
    base_asset_num_queried_sources: 7,
    quote_asset_num_received_rates: 5,
    quote_asset_num_queried_sources: 7,
    standard_deviation: 0,
    forex_timestamp: None,
};

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
            ..E8S_RATE_METADATA
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
async fn test_update_icp_to_usd_exchange_rate_success() {
    set_time_seconds(NOW_SECONDS);

    let past_ts = NOW_SECONDS - ONE_DAY_SECS;

    let current_rate = make_exchange_rate(12_345_000_000, 10, NOW_SECONDS - 10);
    let past_rate = make_exchange_rate(11_000_000_000, 10, past_ts);

    testing::add_exchange_rate_response(Ok(Ok(current_rate)));
    testing::add_exchange_rate_response(Ok(Ok(past_rate)));

    update_icp_to_usd_exchange_rate().await;

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
async fn test_update_icp_to_usd_exchange_rate_error_preserves_cache() {
    set_time_seconds(NOW_SECONDS);

    let past_ts = NOW_SECONDS - ONE_DAY_SECS;

    let current_rate = make_exchange_rate(12_345_000_000, 10, NOW_SECONDS - 10);
    let past_rate = make_exchange_rate(11_000_000_000, 10, past_ts);
    testing::add_exchange_rate_response(Ok(Ok(current_rate)));
    testing::add_exchange_rate_response(Ok(Ok(past_rate)));
    update_icp_to_usd_exchange_rate().await;

    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    update_icp_to_usd_exchange_rate().await;

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
    update_icp_to_usd_exchange_rate().await;

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

/// One entry for each symbol in `SUPPORTED_FIAT_SYMBOLS`, with no rate.
fn empty_fiat_rates() -> Vec<FiatExchangeRate> {
    SUPPORTED_FIAT_SYMBOLS
        .iter()
        .map(|symbol| FiatExchangeRate {
            symbol: symbol.to_string(),
            rate: None,
        })
        .collect::<Vec<FiatExchangeRate>>()
}

#[test]
fn test_fiat_cache_starts_empty() {
    assert_eq!(list_cached_fiat_rates(), empty_fiat_rates());
}

#[tokio::test]
async fn test_update_fiat_exchange_rates_success() {
    set_time_seconds(NOW_SECONDS);
    let forex_timestamp_seconds = NOW_SECONDS - ONE_DAY_SECS;

    let mut expected_cached_fiat_rates = vec![];
    for (symbol, i) in SUPPORTED_FIAT_SYMBOLS.into_iter().zip(1..) {
        let rate_e8s = i * 100_000_000;

        let response = ExchangeRate {
            base_asset: usd(),
            quote_asset: fiat_asset(symbol),
            timestamp: forex_timestamp_seconds,
            rate: rate_e8s,
            metadata: E8S_RATE_METADATA,
        };
        testing::add_exchange_rate_response(Ok(Ok(response)));

        expected_cached_fiat_rates.push(FiatExchangeRate {
            symbol: symbol.to_string(),
            rate: Some(CachedRate {
                rate_e8s,
                timestamp_seconds: forex_timestamp_seconds,
                updated_at_seconds: NOW_SECONDS,
            }),
        });
    }

    update_fiat_exchange_rates().await;

    assert_eq!(list_cached_fiat_rates(), expected_cached_fiat_rates);

    let requests = testing::drain_requests();
    assert_eq!(requests.len(), SUPPORTED_FIAT_SYMBOLS.len());
    for (request, symbol) in requests.iter().zip(SUPPORTED_FIAT_SYMBOLS) {
        assert_eq!(request.base_asset, usd());
        assert_eq!(request.quote_asset, fiat_asset(symbol));
        assert_eq!(request.timestamp, None);
    }
}

#[tokio::test]
async fn test_update_fiat_exchange_rates_error_keeps_rate() {
    let old_rate = CachedRate {
        rate_e8s: 100_000_000,
        timestamp_seconds: NOW_SECONDS,
        updated_at_seconds: NOW_SECONDS,
    };
    let later_seconds = NOW_SECONDS + ONE_HOUR_SECS;
    let new_rate = CachedRate {
        rate_e8s: 200_000_000,
        timestamp_seconds: later_seconds,
        updated_at_seconds: later_seconds,
    };
    let failed_count = 2;

    set_time_seconds(NOW_SECONDS);
    for symbol in SUPPORTED_FIAT_SYMBOLS {
        let response = ExchangeRate {
            base_asset: usd(),
            quote_asset: fiat_asset(symbol),
            timestamp: NOW_SECONDS,
            rate: old_rate.rate_e8s,
            metadata: E8S_RATE_METADATA,
        };
        testing::add_exchange_rate_response(Ok(Ok(response)));
    }
    update_fiat_exchange_rates().await;

    // The first `failed_count` currencies fail. The other currencies get new rates.
    set_time_seconds(later_seconds);
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    testing::add_exchange_rate_response(Ok(Err(ExchangeRateError::ForexInvalidTimestamp)));
    for symbol in &SUPPORTED_FIAT_SYMBOLS[failed_count..] {
        let response = ExchangeRate {
            base_asset: usd(),
            quote_asset: fiat_asset(symbol),
            timestamp: later_seconds,
            rate: new_rate.rate_e8s,
            metadata: E8S_RATE_METADATA,
        };
        testing::add_exchange_rate_response(Ok(Ok(response)));
    }
    update_fiat_exchange_rates().await;

    let mut expected_cached_fiat_rates = SUPPORTED_FIAT_SYMBOLS[..failed_count]
        .iter()
        .map(|symbol| FiatExchangeRate {
            symbol: symbol.to_string(),
            rate: Some(old_rate.clone()),
        })
        .collect::<Vec<FiatExchangeRate>>();
    let updated_fiat_rates =
        SUPPORTED_FIAT_SYMBOLS[failed_count..]
            .iter()
            .map(|symbol| FiatExchangeRate {
                symbol: symbol.to_string(),
                rate: Some(new_rate.clone()),
            });
    expected_cached_fiat_rates.extend(updated_fiat_rates);

    assert_eq!(list_cached_fiat_rates(), expected_cached_fiat_rates);
}

#[tokio::test]
async fn test_update_icp_to_usd_exchange_rate_does_not_touch_fiat_rates() {
    set_time_seconds(NOW_SECONDS);
    let current = make_exchange_rate(300_000_000, E8S_DECIMALS, NOW_SECONDS);
    let one_day_ago = make_exchange_rate(290_000_000, E8S_DECIMALS, NOW_SECONDS - ONE_DAY_SECS);
    testing::add_exchange_rate_response(Ok(Ok(current)));
    testing::add_exchange_rate_response(Ok(Ok(one_day_ago)));

    update_icp_to_usd_exchange_rate().await;

    let expected_current = CachedRate {
        rate_e8s: 300_000_000,
        timestamp_seconds: NOW_SECONDS,
        updated_at_seconds: NOW_SECONDS,
    };
    assert_eq!(get_cached_rates().current, Some(expected_current));
    assert_eq!(list_cached_fiat_rates(), empty_fiat_rates());
}

#[test]
fn test_month_history_keeps_first_rate_of_each_slot() {
    // Step 1: Prepare the world.
    set_time_seconds(NOW_SECONDS);
    let next_slot_start_seconds = NOW_SLOT_START_SECONDS + SLOT_SECS;

    // Step 2: Run the code under test.
    add_rate(&CachedRate {
        rate_e8s: 264_000_000,
        timestamp_seconds: NOW_SLOT_START_SECONDS + 60,
        updated_at_seconds: NOW_SECONDS,
    });
    add_rate(&CachedRate {
        rate_e8s: 265_000_000,
        timestamp_seconds: NOW_SLOT_START_SECONDS + 360,
        updated_at_seconds: NOW_SECONDS,
    });
    set_time_seconds(next_slot_start_seconds);
    add_rate(&CachedRate {
        rate_e8s: 266_000_000,
        timestamp_seconds: next_slot_start_seconds,
        updated_at_seconds: next_slot_start_seconds,
    });

    // Step 3: Verify result(s).
    assert_eq!(
        list_past_month_rates(),
        vec![
            PastMonthRate {
                rate_e8s: 264_000_000,
                timestamp_seconds: NOW_SLOT_START_SECONDS,
            },
            PastMonthRate {
                rate_e8s: 266_000_000,
                timestamp_seconds: next_slot_start_seconds,
            },
        ]
    );
}

#[test]
fn test_month_history_drops_rates_older_than_30_days() {
    // Step 1: Prepare the world.
    set_time_seconds(NOW_SECONDS);
    let expiring_rate = CachedRate {
        rate_e8s: 264_000_000,
        timestamp_seconds: NOW_SLOT_START_SECONDS,
        updated_at_seconds: NOW_SECONDS,
    };
    let kept_rate = CachedRate {
        rate_e8s: 265_000_000,
        timestamp_seconds: NOW_SLOT_START_SECONDS + SLOT_SECS,
        updated_at_seconds: NOW_SECONDS,
    };
    add_rate(&expiring_rate);
    add_rate(&kept_rate);

    // Step 2: Run the code under test.
    let later_seconds = NOW_SLOT_START_SECONDS + 30 * ONE_DAY_SECS + SLOT_SECS;
    set_time_seconds(later_seconds);
    add_rate(&CachedRate {
        rate_e8s: 266_000_000,
        timestamp_seconds: later_seconds,
        updated_at_seconds: later_seconds,
    });

    // Step 3: Verify result(s).
    assert_eq!(
        list_past_month_rates(),
        vec![
            PastMonthRate {
                rate_e8s: 265_000_000,
                timestamp_seconds: NOW_SLOT_START_SECONDS + SLOT_SECS,
            },
            PastMonthRate {
                rate_e8s: 266_000_000,
                timestamp_seconds: later_seconds,
            },
        ]
    );
    let expired_slot_start_seconds = NOW_SLOT_START_SECONDS;
    assert!(
        !list_missing_slot_starts_seconds().contains(&expired_slot_start_seconds),
        "{expired_slot_start_seconds} is out of the 30-day range, so it must not be fetched."
    );
}

#[test]
fn test_month_history_lists_missing_slots_newest_first() {
    // Step 1: Prepare the world.
    set_time_seconds(NOW_SECONDS);
    let stored_slot_start_seconds = NOW_SLOT_START_SECONDS - SLOT_SECS;
    add_rate(&CachedRate {
        rate_e8s: 264_000_000,
        timestamp_seconds: stored_slot_start_seconds,
        updated_at_seconds: NOW_SECONDS,
    });

    // Step 2: Run the code under test.
    let missing_slot_starts_seconds = list_missing_slot_starts_seconds();

    // Step 3: Verify result(s).
    let slot_count = 30 * ONE_DAY_SECS / SLOT_SECS + 1;
    let expected_missing_slot_starts_seconds = (0..slot_count)
        .map(|slot_index| NOW_SLOT_START_SECONDS - slot_index * SLOT_SECS)
        .filter(|&slot_start_seconds| slot_start_seconds != stored_slot_start_seconds)
        .collect::<Vec<u64>>();
    assert_eq!(
        missing_slot_starts_seconds,
        expected_missing_slot_starts_seconds
    );
}

#[tokio::test]
async fn test_fill_month_history_gaps_fetches_failed_slot_on_next_run() {
    // Step 1: Prepare the world.
    set_time_seconds(NOW_SECONDS);
    let failed_slot_start_seconds = NOW_SLOT_START_SECONDS - SLOT_SECS;
    let missing_slot_starts_seconds = list_missing_slot_starts_seconds();

    let mut expected_rates = vec![];
    for &slot_start_seconds in &missing_slot_starts_seconds {
        if slot_start_seconds == failed_slot_start_seconds {
            testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
            continue;
        }

        let rate_e8s = 200_000_000 + slot_start_seconds % 1_000_000;
        let response = make_exchange_rate(rate_e8s, E8S_DECIMALS, slot_start_seconds);
        testing::add_exchange_rate_response(Ok(Ok(response)));

        expected_rates.push(PastMonthRate {
            rate_e8s,
            timestamp_seconds: slot_start_seconds,
        });
    }

    // Step 2: Run the code under test.
    fill_month_history_gaps().await;

    // Step 3: Verify result(s).
    let request_timestamps = testing::drain_requests()
        .iter()
        .map(|request| request.timestamp)
        .collect::<Vec<Option<u64>>>();
    let expected_request_timestamps = missing_slot_starts_seconds
        .iter()
        .map(|&slot_start_seconds| Some(slot_start_seconds))
        .collect::<Vec<Option<u64>>>();
    assert_eq!(request_timestamps, expected_request_timestamps);

    // Oldest first, without the failed slot.
    expected_rates.reverse();
    assert_eq!(list_past_month_rates(), expected_rates);
    assert_eq!(
        list_missing_slot_starts_seconds(),
        vec![failed_slot_start_seconds]
    );

    // Step 4: Run the code under test again. Only the failed slot is fetched.
    let retried_rate_e8s = 250_000_000;
    let response = make_exchange_rate(retried_rate_e8s, E8S_DECIMALS, failed_slot_start_seconds);
    testing::add_exchange_rate_response(Ok(Ok(response)));

    fill_month_history_gaps().await;

    // Step 5: Verify result(s).
    let request_timestamps = testing::drain_requests()
        .iter()
        .map(|request| request.timestamp)
        .collect::<Vec<Option<u64>>>();
    assert_eq!(request_timestamps, vec![Some(failed_slot_start_seconds)]);
    assert_eq!(list_missing_slot_starts_seconds(), Vec::<u64>::new());
    assert!(
        list_past_month_rates().contains(&PastMonthRate {
            rate_e8s: retried_rate_e8s,
            timestamp_seconds: failed_slot_start_seconds,
        }),
        "{:#?}",
        list_past_month_rates()
    );
}

#[tokio::test]
async fn test_update_icp_to_usd_exchange_rate_adds_current_rate_to_month_history() {
    // Step 1: Prepare the world.
    set_time_seconds(NOW_SECONDS);
    let current_rate = make_exchange_rate(264_000_000, E8S_DECIMALS, NOW_SECONDS - 10);
    let one_day_ago_rate =
        make_exchange_rate(255_000_000, E8S_DECIMALS, NOW_SECONDS - ONE_DAY_SECS);
    testing::add_exchange_rate_response(Ok(Ok(current_rate)));
    testing::add_exchange_rate_response(Ok(Ok(one_day_ago_rate)));

    // Step 2: Run the code under test.
    update_icp_to_usd_exchange_rate().await;

    // Step 3: Verify result(s).
    assert_eq!(
        list_past_month_rates(),
        vec![PastMonthRate {
            rate_e8s: 264_000_000,
            timestamp_seconds: NOW_SLOT_START_SECONDS,
        }]
    );
}
