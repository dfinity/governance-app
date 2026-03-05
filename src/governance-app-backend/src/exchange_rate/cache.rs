use candid::CandidType;
use serde::Deserialize;
use std::cell::RefCell;

#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct CachedRate {
    pub rate_e8s: u64,
    pub timestamp_seconds: u64,
    pub updated_at_seconds: u64,
}

#[derive(CandidType, Clone, Debug, Default, Deserialize, PartialEq, Eq)]
pub struct IcpExchangeRateResponse {
    pub current: Option<CachedRate>,
    pub twenty_four_hours_ago: Option<CachedRate>,
}

#[derive(Default)]
struct ExchangeRateCache {
    current: Option<CachedRate>,
    twenty_four_hours_ago: Option<CachedRate>,
}

thread_local! {
    static CACHE: RefCell<ExchangeRateCache> = RefCell::new(ExchangeRateCache::default());
}

pub fn get_cached_rates() -> IcpExchangeRateResponse {
    CACHE.with(|cache| {
        let c = cache.borrow();
        IcpExchangeRateResponse {
            current: c.current.clone(),
            twenty_four_hours_ago: c.twenty_four_hours_ago.clone(),
        }
    })
}

pub fn set_current_rate(rate: CachedRate) {
    CACHE.with(|cache| {
        cache.borrow_mut().current = Some(rate);
    });
}

pub fn set_24h_rate(rate: CachedRate) {
    CACHE.with(|cache| {
        cache.borrow_mut().twenty_four_hours_ago = Some(rate);
    });
}

#[cfg(feature = "testnet")]
pub fn set_mock_rates(current_rate_e8s: u64, rate_24h_ago_e8s: u64) {
    use super::{NANOS_PER_SEC, TWENTY_FOUR_HOURS_SECS};
    let now = super::time::time_nanos() / NANOS_PER_SEC;
    set_current_rate(CachedRate {
        rate_e8s: current_rate_e8s,
        timestamp_seconds: now,
        updated_at_seconds: now,
    });
    set_24h_rate(CachedRate {
        rate_e8s: rate_24h_ago_e8s,
        timestamp_seconds: now.saturating_sub(TWENTY_FOUR_HOURS_SECS),
        updated_at_seconds: now,
    });
}
