use candid::CandidType;
use serde::Deserialize;

#[derive(CandidType, Default, Debug, Clone, Deserialize, PartialEq)]
pub struct TvlState {
    pub total_locked_icp_e8s: u64,
    pub last_update_timestamp_seconds: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    impl TvlState {
        pub fn test_data() -> Self {
            Self {
                total_locked_icp_e8s: 12_345_678_900_000_000,
                last_update_timestamp_seconds: 1_234_567_890,
            }
        }
    }
}
