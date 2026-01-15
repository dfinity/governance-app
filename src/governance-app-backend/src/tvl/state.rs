use candid::CandidType;
use serde::Deserialize;

#[derive(CandidType, Default, Debug, Clone, Deserialize, PartialEq)]
pub struct TvlState {
    pub total_locked_icp_e8s: u64,
    pub last_update_timestamp_seconds: u64,
}
