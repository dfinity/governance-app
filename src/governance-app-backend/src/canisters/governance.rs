//! Client and types for interacting with the NNS Governance canister.
//! Reference: https://github.com/dfinity/ic/blob/master/rs/nns/governance/canister/governance.did

use candid::{CandidType, Principal};
use ic_cdk::call::Call;
use serde::Deserialize;

/// Mainnet NNS Governance canister ID
pub const GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";

/// Subset of GovernanceCachedMetrics that we care about.
///
/// Reference: https://github.com/dfinity/ic/blob/master/rs/nns/governance/canister/governance.did#L338
#[derive(CandidType, Deserialize, Debug, Default, Clone)]
pub struct GovernanceCachedMetrics {
    pub total_locked_e8s: u64,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct GovernanceError {
    pub error_type: i32,
    pub error_message: String,
}

pub async fn get_metrics() -> Result<GovernanceCachedMetrics, String> {
    let governance_id = Principal::from_text(GOVERNANCE_CANISTER_ID)
        .expect("Invalid governance canister ID constant");

    let response = Call::bounded_wait(governance_id, "get_metrics")
        .await
        .map_err(|err| format!("Call to Governance failed: {:?}", err))?;

    let result: Result<GovernanceCachedMetrics, GovernanceError> = response
        .candid()
        .map_err(|err| format!("Failed to decode response: {:?}", err))?;

    result.map_err(|gov_err| {
        format!(
            "Governance error: type={}, message={}",
            gov_err.error_type, gov_err.error_message
        )
    })
}
