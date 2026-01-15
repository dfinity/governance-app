mod state;

use candid::{CandidType, Nat, Principal};
use ic_cdk::call::Call;
use ic_cdk::query;
use ic_cdk_timers::{set_timer, set_timer_interval};
use serde::Deserialize;
use std::cell::RefCell;
use std::time::Duration;

use state::TvlState;

#[derive(CandidType, Deserialize, Default)]
struct GovernanceCachedMetrics {
    pub total_locked_e8s: u64,
}

#[derive(CandidType, Deserialize, Debug)]
struct GovernanceError {
    pub error_type: i32,
    pub error_message: String,
}

// Governance canister ID (mainnet)
const GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";
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
    let governance_id = Principal::from_text(GOVERNANCE_CANISTER_ID).unwrap();

    // First, await the call - this can fail due to network issues, canister being stopped, etc.
    let response = match Call::bounded_wait(governance_id, "get_metrics").await {
        Ok(response) => response,
        Err(err) => {
            ic_cdk::println!("Inter-canister call to governance failed: {:?}", err);
            return;
        }
    };

    // Try to decode as successful metrics response
    let metrics_result: Result<(GovernanceCachedMetrics,), _> =
        response.candid::<(GovernanceCachedMetrics,)>();

    match metrics_result {
        Ok((metrics,)) => {
            let timestamp = ic_cdk::api::time() / NANOS_PER_SECOND;

            STATE.with(|s| {
                let mut state = s.borrow_mut();
                state.total_locked_icp_e8s = metrics.total_locked_e8s;
                state.last_update_timestamp_seconds = timestamp;
            });
            ic_cdk::println!("Updated TVL to {} e8s", metrics.total_locked_e8s);
        }
        Err(decode_err) => {
            // Metrics decoding failed, try to decode as governance error
            let error_result: Result<(GovernanceError,), _> =
                response.candid::<(GovernanceError,)>();

            match error_result {
                Ok((gov_err,)) => {
                    ic_cdk::println!(
                        "Governance returned error: type={}, message={}",
                        gov_err.error_type,
                        gov_err.error_message
                    );
                }
                Err(_) => {
                    ic_cdk::println!("Failed to decode governance response: {:?}", decode_err);
                }
            }
        }
    }
}

#[derive(CandidType)]
struct TvlResponse {
    tvl_icp_e8s: Nat,
    timestamp_seconds: Nat,
}

#[query]
fn get_tvl() -> TvlResponse {
    STATE.with(|s| {
        let state = s.borrow();
        TvlResponse {
            tvl_icp_e8s: Nat::from(state.total_locked_icp_e8s),
            timestamp_seconds: Nat::from(state.last_update_timestamp_seconds),
        }
    })
}
