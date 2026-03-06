use ic_cdk::{init, post_upgrade, query, update};
use ic_http_certification::{HttpRequest, HttpResponse};

mod address_book;
mod assets;
mod exchange_rate;
mod user_data;

use address_book::{AddressBook, GetAddressBookResponse, SetAddressBookResponse};
use exchange_rate::cache::IcpExchangeRateResponse;

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

#[cfg(feature = "testnet")]
#[update]
fn set_mock_exchange_rate(current_rate_e8s: u64, rate_24h_ago_e8s: u64) {
    exchange_rate::set_mock_exchange_rate(current_rate_e8s, rate_24h_ago_e8s);
}
