use candid::{CandidType, Deserialize};

#[cfg(not(test))]
pub use prod::get_proposal_info;

#[cfg(test)]
pub use testing::get_proposal_info;

/// The fields of the NNS governance `ProposalInfo` that the link preview uses.
/// Candid skips the other fields of the record.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProposalInfo {
    pub proposal: Option<Proposal>,
}

/// The fields of the NNS governance `Proposal` that the link preview uses.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct Proposal {
    pub title: Option<String>,
    pub summary: String,
}

#[cfg(not(test))]
mod prod {
    use super::ProposalInfo;
    use candid::Principal;
    use ic_cdk::call::Call;

    /// NNS governance canister.
    const GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";

    pub async fn get_proposal_info(proposal_id: u64) -> Result<Option<ProposalInfo>, String> {
        let governance_canister_id = Principal::from_text(GOVERNANCE_CANISTER_ID)
            .expect("hardcoded governance canister principal must be valid");
        let response = Call::bounded_wait(governance_canister_id, "get_proposal_info")
            .with_arg(proposal_id)
            .await
            .map_err(|e| format!("{e}"))?;
        response
            .candid::<Option<ProposalInfo>>()
            .map_err(|e| format!("{e}"))
    }
}

#[cfg(test)]
pub mod testing {
    use super::ProposalInfo;
    use std::{cell::RefCell, collections::VecDeque};

    thread_local! {
        static REQUESTS: RefCell<VecDeque<u64>> = RefCell::default();
        static RESPONSES: RefCell<VecDeque<Result<Option<ProposalInfo>, String>>> = RefCell::default();
    }

    pub async fn get_proposal_info(proposal_id: u64) -> Result<Option<ProposalInfo>, String> {
        let response = RESPONSES.with(|responses| {
            responses
                .borrow_mut()
                .pop_front()
                .expect("Test must provide a response before get_proposal_info is called.")
        });
        REQUESTS.with(|requests| requests.borrow_mut().push_back(proposal_id));
        response
    }

    pub fn drain_requests() -> Vec<u64> {
        REQUESTS.with(|requests| requests.borrow_mut().drain(..).collect())
    }

    pub fn add_proposal_info_response(response: Result<Option<ProposalInfo>, String>) {
        RESPONSES.with(|responses| responses.borrow_mut().push_back(response));
    }
}
