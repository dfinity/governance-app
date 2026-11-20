use super::cache::{
    add_history_rate, get_cached_rates, list_cached_fiat_rates, list_past_day_rates,
    set_one_day_ago_rate, CachedRate,
};
use super::daily_history::{
    self, DailyRate, DailyRatePair, MissingDailyRate, FIAT_RATE_DELAY_SECS, FIRST_DAY_START_SECONDS,
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

/// Thursday, January 2, 2025 at 00:00:00 UTC, the second day of the daily history.
const SECOND_DAY_START_SECONDS: u64 = FIRST_DAY_START_SECONDS + ONE_DAY_SECS;

/// Sunday, January 5, 2025 at 05:00:00 UTC, the fifth day of the daily history.
/// The USD/fiat rates of the first two days are settled. Those of the last three days are not.
const FIFTH_DAY_SECONDS: u64 = FIRST_DAY_START_SECONDS + 4 * ONE_DAY_SECS + 5 * ONE_HOUR_SECS;

/// The missing rates at `FIFTH_DAY_SECONDS` of an empty history, newest day first.
fn missing_rates_on_fifth_day() -> Vec<MissingDailyRate> {
    (0..5)
        .rev()
        .flat_map(|day_index| {
            let day_start_seconds = FIRST_DAY_START_SECONDS + day_index * ONE_DAY_SECS;
            let is_fiat_settled = day_start_seconds + FIAT_RATE_DELAY_SECS <= FIFTH_DAY_SECONDS;
            let fiat_pairs = SUPPORTED_FIAT_SYMBOLS
                .iter()
                .filter(move |_| is_fiat_settled)
                .map(|&symbol| DailyRatePair::UsdToFiat(symbol));
            std::iter::once(DailyRatePair::IcpToUsd)
                .chain(fiat_pairs)
                .map(move |pair| MissingDailyRate {
                    day_start_seconds,
                    pair,
                })
        })
        .collect()
}

#[test]
fn test_daily_history_lists_missing_rates_newest_day_first() {
    // Step 1: Prepare the world.
    set_time_seconds(FIFTH_DAY_SECONDS);
    let stored_icp_rate = MissingDailyRate {
        day_start_seconds: FIRST_DAY_START_SECONDS,
        pair: DailyRatePair::IcpToUsd,
    };
    let stored_eur_rate = MissingDailyRate {
        day_start_seconds: SECOND_DAY_START_SECONDS,
        pair: DailyRatePair::UsdToFiat("EUR"),
    };
    daily_history::add_rate(
        stored_icp_rate.pair,
        stored_icp_rate.day_start_seconds,
        700_000_000,
    );
    daily_history::add_rate(
        stored_eur_rate.pair,
        stored_eur_rate.day_start_seconds,
        96_000_000,
    );

    // Step 2: Run the code under test.
    let missing_rates = daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS);

    // Step 3: Verify result(s).
    let expected_missing_rates = missing_rates_on_fifth_day()
        .into_iter()
        .filter(|missing_rate| *missing_rate != stored_icp_rate && *missing_rate != stored_eur_rate)
        .collect::<Vec<MissingDailyRate>>();
    assert_eq!(missing_rates, expected_missing_rates);
}

#[test]
fn test_daily_history_does_not_list_fiat_rates_of_recent_days() {
    // Step 1: Prepare the world.
    let third_day_start_seconds = FIRST_DAY_START_SECONDS + 2 * ONE_DAY_SECS;
    set_time_seconds(third_day_start_seconds + FIAT_RATE_DELAY_SECS - 1);

    // Step 2: Run the code under test.
    let missing_fiat_day_starts_seconds = daily_history::list_missing_rates(&["EUR"])
        .into_iter()
        .filter(|missing_rate| missing_rate.pair != DailyRatePair::IcpToUsd)
        .map(|missing_rate| missing_rate.day_start_seconds)
        .collect::<Vec<u64>>();

    // Step 3: Verify result(s).
    assert_eq!(
        missing_fiat_day_starts_seconds,
        vec![SECOND_DAY_START_SECONDS, FIRST_DAY_START_SECONDS]
    );
}

#[test]
fn test_daily_history_lists_rates_of_one_fiat_currency_in_the_range() {
    // Step 1: Prepare the world.
    let third_day_start_seconds = SECOND_DAY_START_SECONDS + ONE_DAY_SECS;
    daily_history::add_rate(
        DailyRatePair::IcpToUsd,
        FIRST_DAY_START_SECONDS,
        700_000_000,
    );
    daily_history::add_rate(
        DailyRatePair::IcpToUsd,
        SECOND_DAY_START_SECONDS,
        710_000_000,
    );
    daily_history::add_rate(
        DailyRatePair::IcpToUsd,
        third_day_start_seconds,
        720_000_000,
    );
    daily_history::add_rate(
        DailyRatePair::UsdToFiat("EUR"),
        FIRST_DAY_START_SECONDS,
        96_000_000,
    );
    daily_history::add_rate(
        DailyRatePair::UsdToFiat("GBP"),
        SECOND_DAY_START_SECONDS,
        80_000_000,
    );

    // Step 2: Run the code under test.
    let eur_rates = daily_history::list_rates(
        FIRST_DAY_START_SECONDS,
        third_day_start_seconds,
        Some("EUR"),
    );
    let icp_rates =
        daily_history::list_rates(SECOND_DAY_START_SECONDS, third_day_start_seconds + 1, None);
    let empty_range_rates = daily_history::list_rates(
        third_day_start_seconds,
        FIRST_DAY_START_SECONDS,
        Some("EUR"),
    );

    // Step 3: Verify result(s).
    assert_eq!(
        eur_rates,
        vec![
            DailyRate {
                timestamp_seconds: FIRST_DAY_START_SECONDS,
                icp_to_usd_e8s: Some(700_000_000),
                usd_to_fiat_e8s: Some(96_000_000),
            },
            DailyRate {
                timestamp_seconds: SECOND_DAY_START_SECONDS,
                icp_to_usd_e8s: Some(710_000_000),
                usd_to_fiat_e8s: None,
            },
        ]
    );
    assert_eq!(
        icp_rates,
        vec![
            DailyRate {
                timestamp_seconds: SECOND_DAY_START_SECONDS,
                icp_to_usd_e8s: Some(710_000_000),
                usd_to_fiat_e8s: None,
            },
            DailyRate {
                timestamp_seconds: third_day_start_seconds,
                icp_to_usd_e8s: Some(720_000_000),
                usd_to_fiat_e8s: None,
            },
        ]
    );
    assert_eq!(empty_range_rates, vec![]);
}

#[test]
fn test_daily_history_lists_a_fiat_rate_without_an_icp_rate() {
    // Step 1: Prepare the world.
    daily_history::add_rate(
        DailyRatePair::UsdToFiat("CHF"),
        FIRST_DAY_START_SECONDS,
        90_000_000,
    );

    // Step 2: Run the code under test.
    let rates = daily_history::list_rates(
        FIRST_DAY_START_SECONDS,
        SECOND_DAY_START_SECONDS,
        Some("CHF"),
    );

    // Step 3: Verify result(s).
    assert_eq!(
        rates,
        vec![DailyRate {
            timestamp_seconds: FIRST_DAY_START_SECONDS,
            icp_to_usd_e8s: None,
            usd_to_fiat_e8s: Some(90_000_000),
        }]
    );
}

#[tokio::test]
async fn test_fill_daily_history_gaps_fetches_failed_rate_on_next_run() {
    // Step 1: Prepare the world.
    set_time_seconds(FIFTH_DAY_SECONDS);
    let missing_rates = daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS);
    let failed_rate = MissingDailyRate {
        day_start_seconds: FIRST_DAY_START_SECONDS,
        pair: DailyRatePair::UsdToFiat("JPY"),
    };
    let mut expected_eur_rates = vec![];
    for (index, missing_rate) in missing_rates.iter().enumerate() {
        if *missing_rate == failed_rate {
            testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
            continue;
        }
        let rate_e8s = 100_000_000 + index as u64;
        let response = make_exchange_rate(rate_e8s, E8S_DECIMALS, missing_rate.day_start_seconds);
        testing::add_exchange_rate_response(Ok(Ok(response)));
        if missing_rate.pair == DailyRatePair::UsdToFiat("EUR") {
            expected_eur_rates.push((missing_rate.day_start_seconds, rate_e8s));
        }
    }

    // Step 2: Run the code under test.
    let should_continue = fill_daily_history_batch().await;

    // Step 3: Verify result(s).
    assert!(!should_continue);
    assert_eq!(missing_rates, missing_rates_on_fifth_day());
    let request_pairs = testing::drain_requests()
        .into_iter()
        .map(|request| {
            (
                request.base_asset.symbol,
                request.quote_asset.symbol,
                request.timestamp,
            )
        })
        .collect::<Vec<(String, String, Option<u64>)>>();
    let expected_request_pairs = missing_rates
        .iter()
        .map(|missing_rate| {
            let (base_symbol, quote_symbol) = match missing_rate.pair {
                DailyRatePair::IcpToUsd => ("ICP", "USD"),
                DailyRatePair::UsdToFiat(symbol) => ("USD", symbol),
            };
            (
                base_symbol.to_string(),
                quote_symbol.to_string(),
                Some(missing_rate.day_start_seconds),
            )
        })
        .collect::<Vec<(String, String, Option<u64>)>>();
    assert_eq!(request_pairs, expected_request_pairs);
    // A failed rate waits for the retry delay.
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS),
        vec![]
    );
    set_time_seconds(FIFTH_DAY_SECONDS + daily_history::FETCH_RETRY_DELAY_SECS);
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS),
        vec![failed_rate]
    );
    let listed_eur_rates =
        daily_history::list_rates(FIRST_DAY_START_SECONDS, FIFTH_DAY_SECONDS, Some("EUR"))
            .into_iter()
            .filter_map(|rate| Some((rate.timestamp_seconds, rate.usd_to_fiat_e8s?)))
            .collect::<Vec<(u64, u64)>>();
    expected_eur_rates.reverse();
    assert_eq!(listed_eur_rates, expected_eur_rates);

    // Step 4: Run the code under test again. Only the failed rate is fetched.
    let response = make_exchange_rate(15_000_000_000, E8S_DECIMALS, FIRST_DAY_START_SECONDS);
    testing::add_exchange_rate_response(Ok(Ok(response)));

    fill_daily_history_batch().await;

    // Step 5: Verify result(s).
    let request_timestamps = testing::drain_requests()
        .iter()
        .map(|request| (request.quote_asset.symbol.clone(), request.timestamp))
        .collect::<Vec<(String, Option<u64>)>>();
    assert_eq!(
        request_timestamps,
        vec![("JPY".to_string(), Some(FIRST_DAY_START_SECONDS))]
    );
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS),
        vec![]
    );
}

#[tokio::test]
async fn test_fill_daily_history_batch_fetches_at_most_one_batch() {
    // Step 1: Prepare the world.
    let tenth_day_seconds = FIRST_DAY_START_SECONDS + 9 * ONE_DAY_SECS + 5 * ONE_HOUR_SECS;
    set_time_seconds(tenth_day_seconds);
    let missing_rates = daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS);
    for missing_rate in missing_rates.iter().take(DAILY_HISTORY_BATCH_SIZE) {
        let response =
            make_exchange_rate(100_000_000, E8S_DECIMALS, missing_rate.day_start_seconds);
        testing::add_exchange_rate_response(Ok(Ok(response)));
    }

    // Step 2: Run the code under test.
    let should_continue = fill_daily_history_batch().await;

    // Step 3: Verify result(s).
    assert!(should_continue);
    assert_eq!(testing::drain_requests().len(), DAILY_HISTORY_BATCH_SIZE);
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS),
        missing_rates[DAILY_HISTORY_BATCH_SIZE..].to_vec()
    );
}

#[tokio::test]
async fn test_fill_daily_history_batch_stops_after_failed_batch() {
    // Step 1: Prepare the world.
    let tenth_day_seconds = FIRST_DAY_START_SECONDS + 9 * ONE_DAY_SECS + 5 * ONE_HOUR_SECS;
    set_time_seconds(tenth_day_seconds);
    for _ in 0..DAILY_HISTORY_BATCH_SIZE {
        testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    }

    // Step 2: Run the code under test.
    let should_continue = fill_daily_history_batch().await;

    // Step 3: Verify result(s).
    assert!(!should_continue);
    assert_eq!(testing::drain_requests().len(), DAILY_HISTORY_BATCH_SIZE);
}

#[tokio::test]
async fn test_fill_daily_history_batch_waits_before_it_tries_a_failed_rate_again() {
    // Step 1: Prepare the world. The first rate of the first batch fails.
    let tenth_day_seconds = FIRST_DAY_START_SECONDS + 9 * ONE_DAY_SECS + 5 * ONE_HOUR_SECS;
    set_time_seconds(tenth_day_seconds);
    let missing_rates = daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS);
    let failed_rate = missing_rates[0];
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    for missing_rate in missing_rates
        .iter()
        .skip(1)
        .take(2 * DAILY_HISTORY_BATCH_SIZE - 1)
    {
        let response =
            make_exchange_rate(100_000_000, E8S_DECIMALS, missing_rate.day_start_seconds);
        testing::add_exchange_rate_response(Ok(Ok(response)));
    }

    // Step 2: Run the code under test. The second batch follows the first one at once.
    assert!(fill_daily_history_batch().await);
    assert!(fill_daily_history_batch().await);

    // Step 3: Verify result(s). The second batch does not try the failed rate.
    let request_timestamps = testing::drain_requests()
        .into_iter()
        .map(|request| request.timestamp)
        .collect::<Vec<Option<u64>>>();
    let expected_timestamps = missing_rates
        .iter()
        .take(2 * DAILY_HISTORY_BATCH_SIZE)
        .map(|missing_rate| Some(missing_rate.day_start_seconds))
        .collect::<Vec<Option<u64>>>();
    assert_eq!(request_timestamps, expected_timestamps);
    assert!(!daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS).contains(&failed_rate));

    // Step 4: After the retry delay, the failed rate is listed again.
    set_time_seconds(tenth_day_seconds + daily_history::FETCH_RETRY_DELAY_SECS);
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS).first(),
        Some(&failed_rate)
    );
}

#[tokio::test]
async fn test_fill_daily_history_batch_doubles_the_retry_delay_after_each_failure() {
    // Step 1: Prepare the world. On the first day, only the ICP/USD rate is missing.
    let first_failure_seconds = FIRST_DAY_START_SECONDS + 5 * ONE_HOUR_SECS;
    set_time_seconds(first_failure_seconds);
    let missing_rate = MissingDailyRate {
        day_start_seconds: FIRST_DAY_START_SECONDS,
        pair: DailyRatePair::IcpToUsd,
    };
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));
    testing::add_exchange_rate_response(Err("canister unreachable".to_string()));

    // Step 2: Run the code under test. The fetch fails two times.
    fill_daily_history_batch().await;
    let second_failure_seconds = first_failure_seconds + daily_history::FETCH_RETRY_DELAY_SECS;
    set_time_seconds(second_failure_seconds);
    fill_daily_history_batch().await;

    // Step 3: Verify result(s). The second delay is twice as long as the first one.
    assert_eq!(testing::drain_requests().len(), 2);
    set_time_seconds(second_failure_seconds + daily_history::FETCH_RETRY_DELAY_SECS);
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS),
        vec![]
    );
    set_time_seconds(second_failure_seconds + 2 * daily_history::FETCH_RETRY_DELAY_SECS);
    assert_eq!(
        daily_history::list_missing_rates(&SUPPORTED_FIAT_SYMBOLS),
        vec![missing_rate]
    );
}

#[test]
fn test_daily_history_retry_delay_stops_at_the_maximum() {
    assert_eq!(
        daily_history::get_retry_delay_seconds(1),
        daily_history::FETCH_RETRY_DELAY_SECS
    );
    assert_eq!(
        daily_history::get_retry_delay_seconds(3),
        4 * daily_history::FETCH_RETRY_DELAY_SECS
    );
    assert_eq!(
        daily_history::get_retry_delay_seconds(u8::MAX),
        daily_history::MAX_FETCH_RETRY_DELAY_SECS
    );
}

#[test]
fn test_daily_history_fill_guard_allows_one_fill_at_a_time() {
    // Step 1: Prepare the world.
    let first_guard = DailyHistoryFillGuard::acquire();

    // Step 2: Run the code under test.
    let second_guard = DailyHistoryFillGuard::acquire();
    drop(first_guard);
    let third_guard = DailyHistoryFillGuard::acquire();

    // Step 3: Verify result(s).
    assert!(second_guard.is_none());
    assert!(third_guard.is_some());
}

#[test]
fn test_list_daily_exchange_rates_rejects_unsupported_fiat_symbol() {
    // Step 1: Prepare the world.
    daily_history::add_rate(
        DailyRatePair::IcpToUsd,
        FIRST_DAY_START_SECONDS,
        700_000_000,
    );

    // Step 2: Run the code under test.
    let usd_response = list_daily_exchange_rates(ListDailyExchangeRatesRequest {
        from_timestamp_seconds: FIRST_DAY_START_SECONDS,
        to_timestamp_seconds: SECOND_DAY_START_SECONDS,
        fiat_symbol: Some("USD".to_string()),
    });
    let icp_only_response = list_daily_exchange_rates(ListDailyExchangeRatesRequest {
        from_timestamp_seconds: FIRST_DAY_START_SECONDS,
        to_timestamp_seconds: SECOND_DAY_START_SECONDS,
        fiat_symbol: None,
    });

    // Step 3: Verify result(s).
    assert_eq!(
        usd_response,
        ListDailyExchangeRatesResponse::UnsupportedFiatSymbol {
            symbol: "USD".to_string(),
        }
    );
    assert_eq!(
        icp_only_response,
        ListDailyExchangeRatesResponse::Ok(vec![DailyRate {
            timestamp_seconds: FIRST_DAY_START_SECONDS,
            icp_to_usd_e8s: Some(700_000_000),
            usd_to_fiat_e8s: None,
        }])
    );
}
