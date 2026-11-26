use ic_cdk::{init, post_upgrade, query, update};
use ic_http_certification::{HttpRequest, HttpResponse, HttpUpdateRequest, HttpUpdateResponse};

mod address_book;
mod assets;
mod exchange_rate;
mod proposal_preview;
mod stable_memory;
mod user_data;

use address_book::{AddressBook, GetAddressBookResponse, SetAddressBookResponse};
use exchange_rate::cache::{CachedRate, FiatExchangeRate, IcpExchangeRateResponse};
use exchange_rate::month_history::PastMonthRate;
use exchange_rate::{ListDailyExchangeRatesRequest, ListDailyExchangeRatesResponse};

#[init]
fn init() {
    assets::certify_assets_hook();
    exchange_rate::init_exchange_rate_timer();
}

#[post_upgrade]
fn post_upgrade() {
    assets::certify_assets_hook();
    exchange_rate::init_exchange_rate_timer();
}

#[query]
fn http_request(req: HttpRequest<'static>) -> HttpResponse<'static> {
    assets::http_request_handler(&req)
}

#[update]
async fn http_request_update(req: HttpUpdateRequest<'static>) -> HttpUpdateResponse<'static> {
    assets::http_request_update_handler(&req).await
}

#[query]
fn get_address_book() -> GetAddressBookResponse {
    let caller = ic_cdk::api::msg_caller();
    address_book::get_address_book(caller)
}

#[update]
fn set_address_book(addresses: AddressBook) -> SetAddressBookResponse {
    let caller = ic_cdk::api::msg_caller();
    address_book::set_address_book(caller, addresses)
}

#[query]
fn get_icp_to_usd_exchange_rate() -> IcpExchangeRateResponse {
    exchange_rate::get_icp_to_usd_exchange_rate()
}

#[query]
fn get_icp_to_usd_rate_history() -> Vec<CachedRate> {
    exchange_rate::get_icp_to_usd_rate_history()
}

#[query]
fn list_icp_to_usd_past_month_rates() -> Vec<PastMonthRate> {
    exchange_rate::list_icp_to_usd_past_month_rates()
}

#[query]
fn list_usd_to_fiat_exchange_rates() -> Vec<FiatExchangeRate> {
    exchange_rate::list_usd_to_fiat_exchange_rates()
}

#[query]
fn list_daily_exchange_rates(
    request: ListDailyExchangeRatesRequest,
) -> ListDailyExchangeRatesResponse {
    exchange_rate::list_daily_exchange_rates(request)
}

/// A markdown guide to the API, for the facts that the Candid types do not give.
const API_DOC: &str = include_str!("api_doc.md");

/// Returns a markdown guide to the API of this canister.
///
/// An agent finds this method in the `candid:service` metadata.
/// See <https://docs.internetcomputer.org/guides/frontends/service-discoverability/>
#[query]
fn get_api_doc() -> String {
    API_DOC.to_string()
}

#[cfg(feature = "testnet")]
#[update]
fn set_mock_exchange_rate(current_rate_e8s: u64, rate_one_day_ago_e8s: u64) {
    exchange_rate::set_mock_exchange_rate(current_rate_e8s, rate_one_day_ago_e8s);
}

#[cfg(feature = "testnet")]
#[update]
fn set_mock_fiat_exchange_rate(symbol: String, rate_e8s: u64) {
    exchange_rate::set_mock_fiat_exchange_rate(symbol, rate_e8s);
}

#[cfg(test)]
mod tests {
    use super::API_DOC;

    /// Returns the names of the methods in the `service` block of `backend.did`.
    fn declared_method_names() -> Vec<String> {
        let did = std::fs::read_to_string("backend.did").unwrap();
        let service = did
            .split_once("service : {")
            .expect("backend.did declares no service")
            .1;
        let method = regex::Regex::new(r"(?m)^\s*([a-z_][a-z0-9_]*)\s*:").unwrap();
        method
            .captures_iter(service)
            .map(|captures| captures[1].to_string())
            .collect()
    }

    #[test]
    fn api_doc_names_every_declared_method() {
        let methods = declared_method_names();
        assert!(methods.contains(&"get_api_doc".to_string()));
        for method in methods {
            assert!(
                API_DOC.contains(&format!("`{method}`")),
                "api_doc.md does not name the method `{method}`."
            );
        }
    }
}
