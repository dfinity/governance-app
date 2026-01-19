use ic_cdk::{init, post_upgrade, query};
use ic_http_certification::{HttpRequest, HttpResponse};

mod assets;

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
