use ic_cdk::{init, post_upgrade, query, update};
use ic_http_certification::{HttpRequest, HttpResponse};

mod address_book;
mod assets;
mod user_data;

use address_book::{AddressBook, GetAddressBookResponse, SetAddressBookResponse};

#[init]
fn init() {
    // Initialize and certify the assets on deployment
    assets::certify_assets_hook();
}

#[post_upgrade]
fn post_upgrade() {
    // Re-certify the assets after an upgrade
    assets::certify_assets_hook();
}

#[query]
fn http_request(req: HttpRequest<'static>) -> HttpResponse<'static> {
    // Delegate HTTP requests to the assets module
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
