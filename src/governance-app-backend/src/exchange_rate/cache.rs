use candid::CandidType;
use serde::Deserialize;
use std::cell::RefCell;
use std::collections::BTreeMap;
use std::ops::Bound;

use super::time::time_seconds;
use super::{ONE_DAY_AGO_TOLERANCE_SECS, ONE_DAY_SECS};

#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct CachedRate {
    pub rate_e8s: u64,
    /// When the XRC observed this rate.
    pub timestamp_seconds: u64,
    /// When our canister last wrote this entry to the cache.
    pub updated_at_seconds: u64,
}

#[derive(CandidType, Clone, Debug, Default, Deserialize, PartialEq, Eq)]
pub struct IcpExchangeRateResponse {
    pub current: Option<CachedRate>,
    pub one_day_ago: Option<CachedRate>,
}

#[derive(Default)]
struct ExchangeRateCache {
    current: Option<CachedRate>,
    one_day_ago: Option<CachedRate>,
    /// Rates of the last day, keyed by `timestamp_seconds`.
    history: BTreeMap<u64, CachedRate>,
}

thread_local! {
    static CACHE: RefCell<ExchangeRateCache> = RefCell::new(ExchangeRateCache::default());
}

pub fn get_cached_rates() -> IcpExchangeRateResponse {
    CACHE.with(|cache| {
        let c = cache.borrow();
        IcpExchangeRateResponse {
            current: c.current.clone(),
            one_day_ago: c.one_day_ago.clone(),
        }
    })
}

/// Returns the one-day-ago rate followed by the newer history rates, oldest first.
/// Without a fresh one-day-ago rate, returns the history rates of the last day.
pub fn get_rate_history() -> Vec<CachedRate> {
    CACHE.with(|cache| {
        let c = cache.borrow();
        let cutoff = time_seconds().saturating_sub(ONE_DAY_SECS);
        let one_day_ago = c.one_day_ago.as_ref().filter(|rate| {
            rate.timestamp_seconds
                .saturating_add(ONE_DAY_AGO_TOLERANCE_SECS)
                >= cutoff
        });
        let (first, start) = match one_day_ago {
            Some(rate) => (Some(rate.clone()), Bound::Excluded(rate.timestamp_seconds)),
            None => (None, Bound::Included(cutoff)),
        };
        first
            .into_iter()
            .chain(
                c.history
                    .range((start, Bound::Unbounded))
                    .map(|(_, rate)| rate.clone()),
            )
            .collect()
    })
}

pub fn set_current_rate(rate: CachedRate) {
    CACHE.with(|cache| {
        let mut c = cache.borrow_mut();
        add_to_history(&mut c.history, rate.clone());
        c.current = Some(rate);
    });
}

pub fn set_one_day_ago_rate(rate: CachedRate) {
    CACHE.with(|cache| {
        cache.borrow_mut().one_day_ago = Some(rate);
    });
}

pub fn add_history_rate(rate: CachedRate) {
    CACHE.with(|cache| add_to_history(&mut cache.borrow_mut().history, rate));
}

/// Inserts the rate and drops the rates older than one day.
fn add_to_history(history: &mut BTreeMap<u64, CachedRate>, rate: CachedRate) {
    history.insert(rate.timestamp_seconds, rate);
    let cutoff = time_seconds().saturating_sub(ONE_DAY_SECS);
    *history = history.split_off(&cutoff);
}

#[cfg(feature = "testnet")]
pub fn set_mock_rates(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    let now = time_seconds();
    set_current_rate(CachedRate {
        rate_e8s: current_rate_e8s,
        timestamp_seconds: now,
        updated_at_seconds: now,
    });
    set_one_day_ago_rate(CachedRate {
        rate_e8s: rate_one_day_ago_e8s,
        timestamp_seconds: now.saturating_sub(ONE_DAY_SECS),
        updated_at_seconds: now,
    });
}
