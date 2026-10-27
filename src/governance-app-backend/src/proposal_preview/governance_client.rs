use candid::{CandidType, Deserialize};

#[cfg(not(test))]
pub use prod::list_proposals;

#[cfg(test)]
pub use testing::list_proposals;

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProposalId {
    pub id: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
pub struct ListProposalInfoRequest {
    pub include_reward_status: Vec<i32>,
    pub omit_large_fields: Option<bool>,
    pub before_proposal: Option<ProposalId>,
    pub limit: u32,
    pub exclude_topic: Vec<i32>,
    pub include_all_manage_neuron_proposals: Option<bool>,
    pub include_status: Vec<i32>,
    pub return_self_describing_action: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ListProposalInfoResponse {
    pub proposal_info: Vec<ProposalInfo>,
}

/// The fields of the NNS governance `ProposalInfo` that the link preview uses.
/// Candid skips the other fields of the record.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProposalInfo {
    pub id: Option<ProposalId>,
    pub proposal: Option<Proposal>,
}

/// The fields of the NNS governance `Proposal` that the link preview uses.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct Proposal {
    pub title: Option<String>,
    pub summary: String,
}

/// Returns the proposal with `proposal_id`, or `None` if it does not exist.
///
/// `get_proposal_info` returns the full payload, which can be larger than the reply size limit
/// of a call (for example, a wasm module). `list_proposals` can omit the large fields.
pub async fn get_proposal_info(proposal_id: u64) -> Result<Option<ProposalInfo>, String> {
    let request = ListProposalInfoRequest {
        before_proposal: proposal_id.checked_add(1).map(|id| ProposalId { id }),
        limit: 1,
        omit_large_fields: Some(true),
        include_all_manage_neuron_proposals: Some(true),
        ..Default::default()
    };
    let response = list_proposals(request).await?;
    // If `proposal_id` does not exist, `before_proposal` returns an older proposal.
    Ok(response
        .proposal_info
        .into_iter()
        .find(|info| info.id == Some(ProposalId { id: proposal_id })))
}

#[cfg(not(test))]
mod prod {
    use super::{ListProposalInfoRequest, ListProposalInfoResponse};
    use candid::Principal;
    use ic_cdk::call::Call;

    /// NNS governance canister.
    const GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";

    pub async fn list_proposals(
        request: ListProposalInfoRequest,
    ) -> Result<ListProposalInfoResponse, String> {
        let governance_canister_id = Principal::from_text(GOVERNANCE_CANISTER_ID)
            .expect("hardcoded governance canister principal must be valid");
        let response = Call::bounded_wait(governance_canister_id, "list_proposals")
            .with_arg(request)
            .await
            .map_err(|e| format!("{e}"))?;
        response
            .candid::<ListProposalInfoResponse>()
            .map_err(|e| format!("{e}"))
    }
}

#[cfg(test)]
pub mod testing {
    use super::{ListProposalInfoRequest, ListProposalInfoResponse};
    use std::{cell::RefCell, collections::VecDeque};

    thread_local! {
        static REQUESTS: RefCell<VecDeque<ListProposalInfoRequest>> = RefCell::default();
        static RESPONSES: RefCell<VecDeque<Result<ListProposalInfoResponse, String>>> = RefCell::default();
    }

    pub async fn list_proposals(
        request: ListProposalInfoRequest,
    ) -> Result<ListProposalInfoResponse, String> {
        let response = RESPONSES.with(|responses| {
            responses
                .borrow_mut()
                .pop_front()
                .expect("Test must provide a response before list_proposals is called.")
        });
        REQUESTS.with(|requests| requests.borrow_mut().push_back(request));
        response
    }

    pub fn drain_requests() -> Vec<ListProposalInfoRequest> {
        REQUESTS.with(|requests| requests.borrow_mut().drain(..).collect())
    }

    pub fn add_list_proposals_response(response: Result<ListProposalInfoResponse, String>) {
        RESPONSES.with(|responses| responses.borrow_mut().push_back(response));
    }
}
