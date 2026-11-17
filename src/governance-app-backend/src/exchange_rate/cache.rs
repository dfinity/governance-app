use candid::CandidType;
use serde::Deserialize;
use std::cell::RefCell;
use std::collections::BTreeMap;

use super::time::time_seconds;
use super::{ONE_DAY_AGO_TOLERANCE_SECS, ONE_DAY_SECS, SUPPORTED_FIAT_SYMBOLS};

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
/// For example, a `rate_e8s` of 314_000_000 for "XYZ" means that 1 USD buys 3.14 XYZ.
#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct FiatExchangeRate {
    /// ISO 4217 currency code, e.g. "EUR".
    pub symbol: String,
    pub rate: Option<CachedRate>,
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
    static FIAT_CACHE: RefCell<BTreeMap<&'static str, CachedRate>> = RefCell::default();
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

/// Returns the rates of the last day, oldest first.
/// The first rate is the one-day-ago rate, unless it is stale.
pub fn list_past_day_rates() -> Vec<CachedRate> {
    CACHE.with(|cache| {
        let cache = cache.borrow();
        let one_day_ago_timestamp_seconds = time_seconds().saturating_sub(ONE_DAY_SECS);
        let mut rates = vec![];

        if let Some(one_day_ago) = cache.one_day_ago.as_ref() {
            let is_fresh = one_day_ago.timestamp_seconds
                >= one_day_ago_timestamp_seconds.saturating_sub(ONE_DAY_AGO_TOLERANCE_SECS);
            if is_fresh {
                rates.push(one_day_ago.clone());
            }
        }

        // The history starts after the one-day-ago rate, or at the one-day cutoff without it.
        let begin = match rates.last() {
            Some(one_day_ago) => one_day_ago.timestamp_seconds.saturating_add(1),
            None => one_day_ago_timestamp_seconds,
        };
        rates.extend(cache.history.range(begin..).map(|(_, rate)| rate.clone()));

        rates
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

/// Returns one entry for each symbol in `SUPPORTED_FIAT_SYMBOLS`, in the same order.
pub fn list_cached_fiat_rates() -> Vec<FiatExchangeRate> {
    FIAT_CACHE.with(|cache| {
        let cache = cache.borrow();
        SUPPORTED_FIAT_SYMBOLS
            .iter()
            .map(|&symbol| FiatExchangeRate {
                symbol: symbol.to_string(),
                rate: cache.get(symbol).cloned(),
            })
            .collect()
    })
}

pub fn set_fiat_rate(symbol: &'static str, rate: CachedRate) {
    FIAT_CACHE.with(|cache| {
        let _previous_rate = cache.borrow_mut().insert(symbol, rate);
    });
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

#[cfg(feature = "testnet")]
pub fn set_mock_fiat_rate(symbol: &'static str, rate_e8s: u64) {
    let now = time_seconds();
    set_fiat_rate(
        symbol,
        CachedRate {
            rate_e8s,
            timestamp_seconds: now,
            updated_at_seconds: now,
        },
    );
}
