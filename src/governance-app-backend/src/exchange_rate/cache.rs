use candid::CandidType;
use serde::Deserialize;
use std::cell::RefCell;

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

pub fn set_current_rate(rate: CachedRate) {
    CACHE.with(|cache| {
        cache.borrow_mut().current = Some(rate);
    });
}

pub fn set_one_day_ago_rate(rate: CachedRate) {
    CACHE.with(|cache| {
        cache.borrow_mut().one_day_ago = Some(rate);
    });
}

#[cfg(feature = "testnet")]
pub fn set_mock_rates(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    use super::ONE_DAY_SECS;
    let now = super::time::time_seconds();
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
