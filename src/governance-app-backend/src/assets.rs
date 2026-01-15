use ic_asset_certification::{
    Asset, AssetCertificationError, AssetConfig, AssetEncoding, AssetFallbackConfig, AssetRouter,
};
use ic_http_certification::{Hash, HeaderField, HttpRequest, HttpResponse, StatusCode};
use include_dir::{include_dir, Dir};
use std::cell::RefCell;

// =================================================================================================
// TYPE DEFINITIONS AND CONSTANTS
// =================================================================================================

/// The directory containing the compiled frontend assets.
///
/// We use the `include_dir!` macro to embed the files at compile time.
/// The path is relative to the `Cargo.toml` of this crate.
/// We point to the `dist` folder of the frontend build.
static ASSETS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../governance-app-frontend/dist");

/// Thread-local storage for the AssetRouter.
///
/// The AssetRouter is responsible for:
/// 1. Certifying assets (generating a Merkle tree and root hash).
/// 2. Serving assets (handling HTTP requests and generating witness proofs).
thread_local! {
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::default());
}

// HTTP Header names and values for caching and security.
const CACHE_CONTROL_HEADER: &str = "cache-control";
const ACCESS_CONTROL_ALLOW_ORIGIN_HEADER: &str = "access-control-allow-origin";
const IMMUTABLE_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
const NO_CACHE_ASSET_CACHE_CONTROL: &str = "public, no-cache, no-store";

// Constants for well-known paths (e.g., for Internet Identity configuration).
const WELL_KNOWN_PATH: &str = "/.well-known";
const II_ALTERNATIVE_ORIGINS_FILE_NAME: &str = "ii-alternative-origins";

/// Custom Content Security Policy (CSP) to allow specific connections.
/// This was carried over from the original implementation.
const CUSTOM_CSP: &str = "default-src 'self' *.devenv.dfinity.network; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' *.devenv.dfinity.network http://*.devenv.dfinity.network http://localhost:* https://icp0.io https://*.icp0.io https://ic0.app https://*.raw.ic0.app https://icp-api.io https://fastly.jsdelivr.net https://api.kongswap.io; img-src 'self' https://*.icp0.io data: blob:; style-src * 'unsafe-inline'; style-src-elem * 'unsafe-inline'; font-src *; object-src 'none'; media-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests";

// =================================================================================================
// PUBLIC API
// =================================================================================================

/// Initializes and certifies the static assets.
///
/// This function should be called in the `init` and `post_upgrade` hooks of the canister.
/// It performs the following steps:
/// 1. Generates default configuration (headers, content-types) for all assets.
/// 2. Collects all files from the embedded `ASSETS_DIR`.
/// 3. Passes them to `certify_my_assets` to build the certification tree.
/// 4. Updates the canister's certified data with the new root hash.
pub fn setup_assets() {
    let assets = collect_assets(&ASSETS_DIR);
    let asset_configs = generate_default_asset_configs();

    match certify_my_assets(assets, asset_configs) {
        Ok(root_hash) => {
            // Set the certified data of the canister to the root hash of the asset tree.
            // This is crucial for the IC to verify the authenticity of the served assets.
            ic_cdk::api::certified_data_set(root_hash);
        }
        Err(err) => {
            // If certification fails, we cannot serve assets securely, so we trap (abort).
            ic_cdk::trap(&format!("Failed to certify assets: {}", err));
        }
    }
}

/// Handles HTTP requests for static assets.
///
/// This function should be called from the canister's `http_request` query method.
/// It delegates the request to `serve_my_assets`.
pub fn http_request_handler(req: &HttpRequest<'static>) -> HttpResponse<'static> {
    // Determine the root hash (although dealing with dynamic state, for static assets
    // the router usually handles the proof generation based on the certified state).
    // Note: In strict mode, we might need to fetch the data certificate.
    serve_my_assets(Vec::new(), req)
}

// =================================================================================================
// INTERNAL ASSET LOGIC
// =================================================================================================

/// Certifies the assets using the thread-local AssetRouter.
///
/// This function is where we customize the asset configuration, such as applying the custom CSP.
fn certify_my_assets(
    assets: Vec<Asset<'static, '_>>,
    mut asset_configs: Vec<AssetConfig>,
) -> Result<Hash, AssetCertificationError> {
    // Iterate over configurations to inject our Custom CSP header
    for config in asset_configs.iter_mut() {
        match config {
            AssetConfig::File { headers, .. } | AssetConfig::Pattern { headers, .. } => {
                // Remove existing CSP header to avoid duplicates/conflicts
                headers.retain(|(name, _)| name != "content-security-policy");
                // Add our Custom CSP
                headers.push((
                    "content-security-policy".to_string(),
                    CUSTOM_CSP.to_string(),
                ));
            }
            _ => {}
        }
    }

    // Use the router to process the assets and configs
    ASSET_ROUTER.with_borrow_mut(|router| {
        router.certify_assets(assets, asset_configs)?;
        Ok(router.root_hash())
    })
}

/// Serves the assets using the thread-local AssetRouter.
///
/// This generates the HTTP response, including the certification headers (authenticity proof).
fn serve_my_assets(
    _root_hash: Vec<u8>, // We rely on the router's internal state
    req: &HttpRequest<'static>,
) -> HttpResponse<'static> {
    let data_certificate = ic_cdk::api::data_certificate().expect("Failed to get data certificate");

    ASSET_ROUTER.with_borrow(|router| {
        let mut response = router
            .serve_asset(&data_certificate, req)
            .expect("Failed to serve asset");

        // Ensure the response is static-compatible
        response
    })
}

/// Recursively collects all files from the `include_dir` directory structure
/// and converts them into `Asset` objects expected by the certification crate.
fn collect_assets<'content, 'path>(dir: &'content Dir<'path>) -> Vec<Asset<'content, 'path>> {
    let mut assets = Vec::new();
    collect_files_recursive(dir, &mut assets);
    assets
}

fn collect_files_recursive<'content, 'path>(
    dir: &'content Dir<'path>,
    assets: &mut Vec<Asset<'content, 'path>>,
) {
    for file in dir.files() {
        let file_path = file.path();
        if file_path.to_string_lossy().ends_with(".gitkeep") {
            continue;
        }
        assets.push(Asset::new(file_path.to_string_lossy(), file.contents()));
    }

    for subdir in dir.dirs() {
        collect_files_recursive(subdir, assets);
    }
}

// =================================================================================================
// ASSET CONFIGURATION HELPER FUNCTIONS
// =================================================================================================

/// Generates the default security and caching headers for all served assets.
fn get_asset_headers(additional_headers: Vec<HeaderField>) -> Vec<HeaderField> {
    let mut headers = vec![
        ("strict-transport-security".to_string(), "max-age=31536000; includeSubDomains".to_string()),
        ("x-frame-options".to_string(), "DENY".to_string()),
        ("x-content-type-options".to_string(), "nosniff".to_string()),
        ("referrer-policy".to_string(), "same-origin".to_string()),
        ("permissions-policy".to_string(), "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(self), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(self), gamepad=(), speaker-selection=(), conversion-measurement=(), focus-without-user-activation=(), hid=(), idle-detection=(), interest-cohort=(), serial=(), sync-script=(), trust-token-redemption=(), window-placement=(), vertical-scroll=()".to_string()),
        ("x-xss-protection".to_string(), "1; mode=block".to_string()),
    ];
    headers.extend(additional_headers);
    headers
}

/// Headers specifically for well-known assets (CORS, no-cache).
fn well_known_asset_headers() -> Vec<HeaderField> {
    get_asset_headers(vec![
        (
            CACHE_CONTROL_HEADER.to_string(),
            NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
        ),
        (
            ACCESS_CONTROL_ALLOW_ORIGIN_HEADER.to_string(),
            "*".to_string(),
        ),
    ])
}

/// Defines the rules for how different file types should be served.
///
/// This configurations mimics the default behavior of `ic-static-assets`.
fn generate_default_asset_configs() -> Vec<AssetConfig> {
    let encodings = vec![
        AssetEncoding::Brotli.default_config(),
        AssetEncoding::Gzip.default_config(),
    ];

    // Cookie to track the canister ID
    let canister_id_cookie_header: HeaderField = (
        "set-cookie".to_string(),
        format!("canisterId={}", ic_cdk::api::canister_self().to_text()),
    );

    vec![
        // HTML: No cache + fallback for SPA routing
        AssetConfig::File {
            path: "index.html".to_string(),
            content_type: Some("text/html".to_string()),
            headers: get_asset_headers(vec![
                (
                    CACHE_CONTROL_HEADER.to_string(),
                    NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
                ),
                canister_id_cookie_header.clone(),
            ]),
            fallback_for: vec![AssetFallbackConfig {
                scope: "/".to_string(),
                status_code: Some(StatusCode::OK),
            }],
            aliased_by: vec!["/".to_string()],
            encodings: encodings.clone(),
        },
        // JS: Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.js".to_string(),
            content_type: Some("text/javascript".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: encodings.clone(),
        },
        // CSS: Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.css".to_string(),
            content_type: Some("text/css".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: encodings.clone(),
        },
        // Images (PNG): Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.png".to_string(),
            content_type: Some("image/png".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: encodings.clone(),
        },
        // Images (SVG): Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.svg".to_string(),
            content_type: Some("image/svg+xml".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: encodings.clone(),
        },
        // Plain text: Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.txt".to_string(),
            content_type: Some("text/plain".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: encodings.clone(),
        },
        // ICO: Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.ico".to_string(),
            content_type: Some("image/x-icon".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        // Fonts (OTF): Immutable cache
        AssetConfig::Pattern {
            pattern: "**/*.otf".to_string(),
            content_type: Some("application/x-font-opentype".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        // .well-known files
        AssetConfig::Pattern {
            pattern: format!("{WELL_KNOWN_PATH}/*"),
            content_type: None,
            headers: well_known_asset_headers(),
            encodings: vec![],
        },
        // Specific .well-known file with JSON type
        AssetConfig::File {
            path: format!("{WELL_KNOWN_PATH}/{II_ALTERNATIVE_ORIGINS_FILE_NAME}"),
            content_type: Some("application/json".to_string()),
            headers: well_known_asset_headers(),
            fallback_for: vec![],
            aliased_by: vec![],
            encodings: vec![],
        },
    ]
}
