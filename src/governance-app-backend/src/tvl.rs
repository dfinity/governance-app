use candid::{CandidType, Nat};
use ic_cdk::query;
use ic_cdk_timers::{set_timer, set_timer_interval};
use std::cell::RefCell;
use std::time::Duration;

use crate::canisters::governance;
use state::TvlState;

mod state;

#[derive(CandidType, Debug, PartialEq)]
pub struct TvlResult {
    tvl_icp_e8s: Nat,
    timestamp_seconds: Nat,
}

#[derive(CandidType, Debug, PartialEq)]
pub enum TvlResponse {
    Ok(TvlResult),
}

const UPDATE_INTERVAL_SECONDS: u64 = 6 * 60 * 60; // 4 times a day
const NANOS_PER_SECOND: u64 = 1_000_000_000;

thread_local! {
    static STATE: RefCell<TvlState> = RefCell::new(TvlState::default());
}

pub fn start_background_updates() {
    // Initial update after 1 second
    set_timer(Duration::from_secs(1), || {
        ic_cdk::futures::spawn(update_locked_icp());
    });

    // Periodic updates every 6 hours
    set_timer_interval(Duration::from_secs(UPDATE_INTERVAL_SECONDS), || {
        ic_cdk::futures::spawn(update_locked_icp());
    });
}

async fn update_locked_icp() {
    match governance::get_metrics().await {
        Ok(metrics) => {
            let timestamp = ic_cdk::api::time() / NANOS_PER_SECOND;

            STATE.with(|s| {
                let mut state = s.borrow_mut();
                state.total_locked_icp_e8s = metrics.total_locked_e8s;
                state.last_update_timestamp_seconds = timestamp;
            });
            ic_cdk::println!("Updated TVL to {} e8s", metrics.total_locked_e8s);
        }
        Err(err) => {
            ic_cdk::println!("Failed to fetch governance metrics: {}", err);
        }
    }
}

#[query]
fn get_tvl() -> TvlResponse {
    STATE.with(|s| {
        let state = s.borrow();

        TvlResponse::Ok(TvlResult {
            tvl_icp_e8s: Nat::from(state.total_locked_icp_e8s),
            timestamp_seconds: Nat::from(state.last_update_timestamp_seconds),
        })
    })
}
