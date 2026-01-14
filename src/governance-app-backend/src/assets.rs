use ic_asset_certification::{Asset, AssetCertificationError, AssetConfig, AssetRouter};
use ic_http_certification::{Hash, HttpRequest, HttpResponse};
use std::cell::RefCell;

thread_local! {
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::default());
}

// Original copied from: https://github.com/ilbertt/ic-static-assets/blob/main/packages/ic-static-assets/src/certification.rs#L32
const CUSTOM_CSP: &str = "default-src 'self' *.devenv.dfinity.network; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' *.devenv.dfinity.network http://*.devenv.dfinity.network http://localhost:* https://icp0.io https://*.icp0.io https://ic0.app https://*.raw.ic0.app https://icp-api.io https://fastly.jsdelivr.net https://api.kongswap.io; img-src 'self' https://*.icp0.io data: blob:; style-src * 'unsafe-inline'; style-src-elem * 'unsafe-inline'; font-src *; object-src 'none'; media-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests";

pub fn certify_my_assets(
    assets: Vec<Asset<'static, '_>>,
    mut asset_configs: Vec<AssetConfig>,
) -> Result<Hash, AssetCertificationError> {
    for config in asset_configs.iter_mut() {
        match config {
            AssetConfig::File { headers, .. } | AssetConfig::Pattern { headers, .. } => {
                // Remove existing CSP header
                headers.retain(|(name, _)| name != "content-security-policy");
                // Custom CSP
                headers.push((
                    "content-security-policy".to_string(),
                    CUSTOM_CSP.to_string(),
                ));
            }
            _ => {}
        }
    }
    ASSET_ROUTER.with_borrow_mut(|router| {
        router.certify_assets(assets, asset_configs)?;
        Ok(router.root_hash())
    })
}

pub fn serve_my_assets(root_hash: Vec<u8>, req: &HttpRequest<'static>) -> HttpResponse<'static> {
    ASSET_ROUTER.with_borrow(|router| {
        router
            .serve_asset(&root_hash, req)
            .expect("Failed to serve asset")
    })
}
