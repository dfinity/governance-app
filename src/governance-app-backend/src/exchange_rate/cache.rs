use candid::CandidType;
use serde::Deserialize;
use std::cell::RefCell;
use std::collections::BTreeMap;

use super::FIAT_SYMBOLS;

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

/// Units of `symbol` for one USD.
#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct FiatExchangeRate {
    /// ISO 4217 currency code, e.g. "EUR".
    pub symbol: String,
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
    static FIAT_CACHE: RefCell<BTreeMap<&'static str, ExchangeRateCache>> = RefCell::default();
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

/// Returns one entry for each symbol in `FIAT_SYMBOLS`, in the same order.
pub fn get_cached_fiat_rates() -> Vec<FiatExchangeRate> {
    FIAT_CACHE.with(|cache| {
        let c = cache.borrow();
        FIAT_SYMBOLS
            .iter()
            .map(|&symbol| {
                let rates = c.get(symbol);
                FiatExchangeRate {
                    symbol: symbol.to_string(),
                    current: rates.and_then(|r| r.current.clone()),
                    one_day_ago: rates.and_then(|r| r.one_day_ago.clone()),
                }
            })
            .collect()
    })
}

pub fn set_current_fiat_rate(symbol: &'static str, rate: CachedRate) {
    FIAT_CACHE.with(|cache| {
        cache.borrow_mut().entry(symbol).or_default().current = Some(rate);
    });
}

pub fn set_one_day_ago_fiat_rate(symbol: &'static str, rate: CachedRate) {
    FIAT_CACHE.with(|cache| {
        cache.borrow_mut().entry(symbol).or_default().one_day_ago = Some(rate);
    });
}

#[cfg(feature = "testnet")]
fn mock_rates(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) -> (CachedRate, CachedRate) {
    use super::ONE_DAY_SECS;
    let now = super::time::time_seconds();
    let current = CachedRate {
        rate_e8s: current_rate_e8s,
        timestamp_seconds: now,
        updated_at_seconds: now,
    };
    let one_day_ago = CachedRate {
        rate_e8s: rate_one_day_ago_e8s,
        timestamp_seconds: now.saturating_sub(ONE_DAY_SECS),
        updated_at_seconds: now,
    };
    (current, one_day_ago)
}

#[cfg(feature = "testnet")]
pub fn set_mock_rates(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    let (current, one_day_ago) = mock_rates(current_rate_e8s, rate_one_day_ago_e8s);
    set_current_rate(current);
    set_one_day_ago_rate(one_day_ago);
}

#[cfg(feature = "testnet")]
pub fn set_mock_fiat_rates(symbol: &'static str, current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    let (current, one_day_ago) = mock_rates(current_rate_e8s, rate_one_day_ago_e8s);
    set_current_fiat_rate(symbol, current);
    set_one_day_ago_fiat_rate(symbol, one_day_ago);
}
