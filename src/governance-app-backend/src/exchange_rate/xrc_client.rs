pub use ic_xrc_types::{Asset, AssetClass, GetExchangeRateRequest, GetExchangeRateResult};

#[cfg(not(test))]
pub use prod::get_exchange_rate;

#[cfg(test)]
pub use testing::get_exchange_rate;

#[cfg(not(test))]
mod prod {
    use super::{GetExchangeRateRequest, GetExchangeRateResult};
    use candid::Principal;
    use ic_cdk::call::Call;

    pub async fn get_exchange_rate(
        request: GetExchangeRateRequest,
    ) -> Result<GetExchangeRateResult, String> {
        let xrc_canister_id = Principal::from_text("uf6dk-hyaaa-aaaaq-qaaaq-cai").unwrap();
        let response = Call::unbounded_wait(xrc_canister_id, "get_exchange_rate")
            .with_arg(request)
            .await
            .map_err(|e| format!("{e}"))?;
        response
            .candid::<GetExchangeRateResult>()
            .map_err(|e| format!("{e}"))
    }
}

#[cfg(test)]
pub mod testing {
    use super::*;
    use std::{cell::RefCell, collections::VecDeque};

    thread_local! {
        pub static REQUESTS: RefCell<VecDeque<GetExchangeRateRequest>> = RefCell::default();
        pub static RESPONSES: RefCell<VecDeque<Result<GetExchangeRateResult, String>>> = RefCell::default();
    }

    pub async fn get_exchange_rate(
        request: GetExchangeRateRequest,
    ) -> Result<GetExchangeRateResult, String> {
        let response = RESPONSES.with(|responses| {
            responses
                .borrow_mut()
                .pop_front()
                .expect("Test must provide a response before get_exchange_rate is called.")
        });
        REQUESTS.with(|requests| {
            requests.borrow_mut().push_back(request);
        });
        response
    }

    pub fn drain_requests() -> Vec<GetExchangeRateRequest> {
        REQUESTS.with(|requests| requests.borrow_mut().drain(..).collect())
    }

    pub fn add_exchange_rate_response(response: Result<GetExchangeRateResult, String>) {
        RESPONSES.with(|responses| responses.borrow_mut().push_back(response));
    }
}
