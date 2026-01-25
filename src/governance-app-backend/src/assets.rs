use ic_asset_certification::{
    Asset, AssetCertificationError, AssetConfig, AssetEncoding, AssetFallbackConfig, AssetRouter,
};
use ic_http_certification::{Hash, HeaderField, HttpRequest, HttpResponse, StatusCode};
use include_dir::{include_dir, Dir};
use std::cell::RefCell;

thread_local! {
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::default());
}

// =================================================================================================
// CONSTANTS
// =================================================================================================

/// Frontend assets embedded at compile time from the `dist` folder.
static ASSETS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../governance-app-frontend/dist");

// Cache control header values
const CACHE_CONTROL_HEADER: &str = "cache-control";
const IMMUTABLE_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
const NO_CACHE_ASSET_CACHE_CONTROL: &str = "public, no-cache, no-store";
// TODO: Switch to IMMUTABLE_ASSET_CACHE_CONTROL once images/videos are finalized
const DEV_ASSET_CACHE_CONTROL: &str = "public, max-age=3600"; // 1 hour cache for development

// CORS header
const ACCESS_CONTROL_ALLOW_ORIGIN_HEADER: &str = "access-control-allow-origin";

// Well-known paths for Internet Identity alternative origins configuration.
// See: https://internetcomputer.org/docs/current/developer-docs/identity/internet-identity/alternative-origins
const WELL_KNOWN_PATH: &str = "/.well-known";
const II_ALTERNATIVE_ORIGINS_FILE_NAME: &str = "ii-alternative-origins";

// TODO: Review CSP directives for production - some entries may be overly permissive.
/// Content Security Policy directives. Each entry is joined with "; " to form the header value.
const CSP_DIRECTIVES: &[&str] = &[
    "default-src 'self' *.devenv.dfinity.network",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' *.devenv.dfinity.network http://*.devenv.dfinity.network http://localhost:* https://icp0.io https://*.icp0.io https://ic0.app https://*.raw.ic0.app https://icp-api.io https://fastly.jsdelivr.net https://api.kongswap.io https://plausible.io/api/event",
    "img-src 'self' https://*.icp0.io data: blob:",
    "style-src * 'unsafe-inline'",
    "style-src-elem * 'unsafe-inline'",
    "font-src *",
    "object-src 'none'",
    "media-src 'self' data:",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
];

fn get_csp_header_value() -> String {
    CSP_DIRECTIVES.join("; ")
}

// =================================================================================================
// PUBLIC API
// =================================================================================================

/// Initializes and certifies all static assets. Call this in `init` and `post_upgrade` hooks.
///
/// Builds a Merkle tree of all assets and sets the root hash as the canister's certified data,
/// enabling the IC to verify asset authenticity when served.
pub fn certify_assets_hook() {
    match certify_all_assets_with_internal_router(&ASSETS_DIR) {
        Ok(root_hash) => ic_cdk::api::certified_data_set(root_hash),
        Err(err) => ic_cdk::trap(&format!("Failed to certify assets: {}", err)),
    }
}

/// Handles HTTP requests for static assets. Call this from the canister's `http_request` query.
pub fn http_request_handler(req: &HttpRequest<'static>) -> HttpResponse<'static> {
    serve_asset(req)
}

// =================================================================================================
// INTERNAL FUNCTIONS
// =================================================================================================

/// Builds the certification tree
fn certify_all_assets_with_internal_router(
    assets_dir: &'static Dir<'static>,
) -> Result<Hash, AssetCertificationError> {
    let assets = collect_assets(assets_dir);
    let asset_configs = generate_default_asset_configs();

    ASSET_ROUTER.with_borrow_mut(|router| {
        router.certify_assets(assets, asset_configs)?;
        Ok(router.root_hash())
    })
}

/// Serves an asset with its certification proof.
fn serve_asset(req: &HttpRequest<'static>) -> HttpResponse<'static> {
    let data_certificate = ic_cdk::api::data_certificate().expect("No data certificate available");

    // TODO: Enhace error handling
    ASSET_ROUTER.with_borrow(|router| {
        router
            .serve_asset(&data_certificate, req)
            .expect("Failed to serve asset")
    })
}

/// Recursively collects all files from an embedded directory into `Asset` objects.
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
        let path_str = file.path().to_string_lossy();

        // TODO: Consider filtering all hidden files (starting with '.')
        if path_str.ends_with(".gitkeep") {
            continue;
        }
        assets.push(Asset::new(path_str, file.contents()));
    }

    for subdir in dir.dirs() {
        collect_files_recursive(subdir, assets);
    }
}

// =================================================================================================
// ASSET CONFIGURATION
// =================================================================================================

/// Returns security headers with optional additional headers appended.
// TODO: Review permissions-policy for production - some entries may be unnecessary.
fn get_asset_headers(additional_headers: Vec<HeaderField>) -> Vec<HeaderField> {
    let mut headers = vec![
        ("strict-transport-security".to_string(), "max-age=31536000; includeSubDomains".to_string()),
        ("x-frame-options".to_string(), "DENY".to_string()),
        ("x-content-type-options".to_string(), "nosniff".to_string()),
        ("content-security-policy".to_string(), get_csp_header_value()),
        ("referrer-policy".to_string(), "same-origin".to_string()),
        ("permissions-policy".to_string(), "accelerometer=(), ambient-light-sensor=(), autoplay=(self), battery=(), camera=(self), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(self), gamepad=(), speaker-selection=(), conversion-measurement=(), focus-without-user-activation=(), hid=(), idle-detection=(), interest-cohort=(), serial=(), sync-script=(), trust-token-redemption=(), window-placement=(), vertical-scroll=()".to_string()),
        ("x-xss-protection".to_string(), "1; mode=block".to_string()),
    ];
    headers.extend(additional_headers);
    headers
}

/// Returns headers for `/.well-known` assets: no caching and permissive CORS.
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

/// Generates asset configurations defining content-type, caching, and encoding rules per file type.
fn generate_default_asset_configs() -> Vec<AssetConfig> {
    // Text-based assets benefit from compression
    let text_encodings = vec![
        AssetEncoding::Brotli.default_config(),
        AssetEncoding::Gzip.default_config(),
    ];

    // Sets a cookie so the frontend can identify which canister it's talking to
    let canister_id_cookie_header: HeaderField = (
        "set-cookie".to_string(),
        format!("canisterId={}", ic_cdk::api::canister_self().to_text()),
    );

    vec![
        // index.html: No caching (content changes on deploys), serves as SPA fallback for all routes
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
            encodings: text_encodings.clone(),
        },
        // Text-based assets: immutable caching + compression
        AssetConfig::Pattern {
            pattern: "**/*.js".to_string(),
            content_type: Some("text/javascript".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: text_encodings.clone(),
        },
        AssetConfig::Pattern {
            pattern: "**/*.css".to_string(),
            content_type: Some("text/css".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: text_encodings.clone(),
        },
        AssetConfig::Pattern {
            pattern: "**/*.svg".to_string(),
            content_type: Some("image/svg+xml".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: text_encodings.clone(),
        },
        AssetConfig::Pattern {
            pattern: "**/*.txt".to_string(),
            content_type: Some("text/plain".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: text_encodings.clone(),
        },
        AssetConfig::Pattern {
            pattern: "**/*.png".to_string(),
            content_type: Some("image/png".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                DEV_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        AssetConfig::Pattern {
            pattern: "**/*.ico".to_string(),
            content_type: Some("image/x-icon".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        AssetConfig::Pattern {
            pattern: "**/*.otf".to_string(),
            content_type: Some("application/x-font-opentype".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        AssetConfig::Pattern {
            pattern: "**/*.webp".to_string(),
            content_type: Some("image/webp".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                DEV_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        AssetConfig::Pattern {
            pattern: "**/*.webm".to_string(),
            content_type: Some("video/webm".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                DEV_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        AssetConfig::Pattern {
            pattern: "**/*.mp4".to_string(),
            content_type: Some("video/mp4".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                DEV_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        // PWA manifest: no caching (may change between deploys)
        AssetConfig::Pattern {
            pattern: "**/*.webmanifest".to_string(),
            content_type: Some("application/manifest+json".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        // Well-known files for Internet Identity alternative origins
        AssetConfig::Pattern {
            pattern: format!("{WELL_KNOWN_PATH}/*"),
            content_type: None,
            headers: well_known_asset_headers(),
            encodings: vec![],
        },
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
