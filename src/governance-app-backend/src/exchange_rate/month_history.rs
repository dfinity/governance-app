use candid::CandidType;
use ic_stable_structures::StableBTreeMap;
use serde::Deserialize;
use std::cell::RefCell;

use super::cache::CachedRate;
use super::time::time_seconds;
use super::{ONE_DAY_SECS, ONE_HOUR_SECS};
use crate::stable_memory::{get_memory, Memory, ICP_TO_USD_MONTH_HISTORY_MEMORY_ID};

pub(super) const SLOT_SECS: u64 = 2 * ONE_HOUR_SECS;
/// 30 days of slots, plus one, so that the oldest rate is at least 30 days old.
const SLOT_COUNT: u64 = 30 * ONE_DAY_SECS / SLOT_SECS + 1;

/// The ICP/USD rate at the start of a two-hour slot.
/// For example, a `rate_e8s` of 264_000_000 means that 1 ICP buys 2.64 USD.
#[derive(CandidType, Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct PastMonthRate {
    pub rate_e8s: u64,
    pub timestamp_seconds: u64,
}

thread_local! {
    /// Maps the start of each slot, in seconds, to the rate in e8s.
    static RATES_E8S: RefCell<StableBTreeMap<u64, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(get_memory(ICP_TO_USD_MONTH_HISTORY_MEMORY_ID))
    );
}

/// Adds the rate to its slot, unless the slot already has a rate, and drops the expired slots.
pub fn add_rate(rate: &CachedRate) {
    let slot_start_seconds = get_slot_start_seconds(rate.timestamp_seconds);
    let oldest_slot_start_seconds = get_oldest_slot_start_seconds();

    RATES_E8S.with(|rates_e8s| {
        let mut rates_e8s = rates_e8s.borrow_mut();

        if !rates_e8s.contains_key(&slot_start_seconds) {
            let _previous_rate_e8s = rates_e8s.insert(slot_start_seconds, rate.rate_e8s);
        }

        let expired_slot_starts_seconds = rates_e8s
            .keys_range(..oldest_slot_start_seconds)
            .collect::<Vec<u64>>();
        for slot_start_seconds in expired_slot_starts_seconds {
            let _expired_rate_e8s = rates_e8s.remove(&slot_start_seconds);
        }
    });
}

/// Returns the rates of the last 30 days, oldest first. Slots without a rate have no entry.
pub fn list_past_month_rates() -> Vec<PastMonthRate> {
    RATES_E8S.with(|rates_e8s| {
        rates_e8s
            .borrow()
            .range(get_oldest_slot_start_seconds()..)
            .map(|entry| PastMonthRate {
                rate_e8s: entry.value(),
                timestamp_seconds: *entry.key(),
            })
            .collect()
    })
}

/// Returns the start of each slot without a rate, newest first.
pub fn list_missing_slot_starts_seconds() -> Vec<u64> {
    let newest_slot_start_seconds = get_slot_start_seconds(time_seconds());

    RATES_E8S.with(|rates_e8s| {
        let rates_e8s = rates_e8s.borrow();

        (0..SLOT_COUNT)
            .map(|slot_index| {
                newest_slot_start_seconds.saturating_sub(slot_index.saturating_mul(SLOT_SECS))
            })
            .filter(|slot_start_seconds| !rates_e8s.contains_key(slot_start_seconds))
            .collect()
    })
}

fn get_slot_start_seconds(timestamp_seconds: u64) -> u64 {
    timestamp_seconds.saturating_sub(timestamp_seconds % SLOT_SECS)
}

fn get_oldest_slot_start_seconds() -> u64 {
    let history_length_seconds = SLOT_COUNT.saturating_sub(1).saturating_mul(SLOT_SECS);
    get_slot_start_seconds(time_seconds()).saturating_sub(history_length_seconds)
}
