use crate::proposal_preview;
use ic_asset_certification::{
    Asset, AssetCertificationError, AssetConfig, AssetEncoding, AssetFallbackConfig, AssetMap,
    AssetRouter,
};
use ic_http_certification::{
    Hash, HeaderField, HttpRequest, HttpResponse, HttpUpdateRequest, HttpUpdateResponse, Method,
    StatusCode,
};
use include_dir::{include_dir, Dir};
use std::{cell::RefCell, collections::VecDeque};

thread_local! {
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::default());
    /// IDs of the proposals with a certified page in `ASSET_ROUTER`, oldest first.
    static PROPOSAL_PAGE_IDS: RefCell<VecDeque<u64>> = RefCell::default();
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

/// The maximum number of certified proposal pages. Each page is about 5 KB.
/// When the cache is full, a new page replaces the oldest one.
const MAX_PROPOSAL_PAGES: usize = 1_000;

const INDEX_HTML_PATH: &str = "index.html";

const RANGE_HEADER: &str = "range";

// CORS header
const ACCESS_CONTROL_ALLOW_ORIGIN_HEADER: &str = "access-control-allow-origin";

// Well-known paths for Internet Identity alternative origins configuration.
// Asset paths are relative to `dist` and have no leading slash.
// See: https://internetcomputer.org/docs/current/developer-docs/identity/internet-identity/alternative-origins
const WELL_KNOWN_PATH: &str = ".well-known";
const II_ALTERNATIVE_ORIGINS_FILE_NAME: &str = "ii-alternative-origins";

/// Content Security Policy directives. Each entry is joined with "; " to form the header value.
const CSP_DIRECTIVES: &[&str] = &[
    "default-src 'self' *.devenv.dfinity.network",
    "script-src 'self'",
    "connect-src 'self' https://icp0.io https://*.icp0.io https://ic0.app https://*.raw.ic0.app https://icp-api.io https://api.kongswap.io https://plausible.io/api/event",
    "img-src 'self' https://*.icp0.io data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self' data:",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
];

fn get_csp_header_value() -> String {
    CSP_DIRECTIVES
        .iter()
        .map(|directive| {
            // Allow E2E tests to reach the local replica
            if cfg!(feature = "testnet") && directive.starts_with("connect-src") {
                format!("{} http://localhost:*", directive)
            } else {
                directive.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("; ")
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
///
/// A query cannot call NNS governance. For a proposal page that is not certified yet, the response
/// asks the HTTP gateway to send the request again to `http_request_update`.
pub fn http_request_handler(req: &HttpRequest<'static>) -> HttpResponse<'static> {
    if needs_proposal_page(req) {
        return HttpResponse::builder().with_upgrade(true).build();
    }
    serve_asset(req)
}

/// Handles the HTTP requests that `http_request_handler` upgrades.
/// Call this from the canister's `http_request_update` update.
///
/// For a proposal page, it certifies `index.html` with the proposal's link preview tags.
/// In all other cases, and if the proposal cannot be fetched, it returns `index.html`.
pub async fn http_request_update_handler(
    req: &HttpUpdateRequest<'_>,
) -> HttpUpdateResponse<'static> {
    let proposal_id = req
        .get_path()
        .ok()
        .and_then(|path| proposal_preview::parse_proposal_id(&path));
    if let Some(proposal_id) = proposal_id {
        if let Some(response) = proposal_page_response(proposal_id) {
            return response.into();
        }
        if let Some(page) = proposal_preview::render_proposal_page(index_html(), proposal_id).await
        {
            certify_proposal_page(proposal_id, page);
            if let Some(response) = proposal_page_response(proposal_id) {
                return response.into();
            }
        }
    }
    index_html_response().into()
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
            .serve_asset(&data_certificate, &without_unusable_range(router, req))
            .expect("Failed to serve asset")
    })
}

/// Removes the `Range` header unless the requested asset is chunked.
///
/// `AssetRouter` stores an asset under a byte range only if the asset is chunked. For any other
/// asset, a `Range` header misses the exact entry and selects the wildcard fallback. The HTTP
/// gateway rejects that response, because an exact entry exists for the path. The gateway also
/// uses `Range` to fetch the later chunks of a chunked asset, so those requests keep the header.
fn without_unusable_range(
    router: &AssetRouter<'static>,
    req: &HttpRequest<'static>,
) -> HttpRequest<'static> {
    let is_chunked = req
        .get_path()
        .is_ok_and(|path| router.get_assets().get(path, None, Some(0)).is_some());

    let mut req = req.clone();
    if !is_chunked {
        req.headers_mut()
            .retain(|(name, _)| !name.eq_ignore_ascii_case(RANGE_HEADER));
    }
    req
}

/// Returns true for a GET request of a proposal page that is not certified yet.
fn needs_proposal_page(req: &HttpRequest) -> bool {
    req.method() == Method::GET
        && req
            .get_path()
            .ok()
            .and_then(|path| proposal_preview::parse_proposal_id(&path))
            .is_some_and(|proposal_id| proposal_page_response(proposal_id).is_none())
}

fn proposal_page_response(proposal_id: u64) -> Option<HttpResponse<'static>> {
    let path = proposal_preview::proposal_path(proposal_id);
    ASSET_ROUTER.with_borrow(|router| router.get_assets().get(path, None, None).cloned())
}

fn index_html() -> &'static str {
    ASSETS_DIR
        .get_file(INDEX_HTML_PATH)
        .and_then(|file| file.contents_utf8())
        .expect("index.html must be embedded")
}

fn index_html_response() -> HttpResponse<'static> {
    ASSET_ROUTER.with_borrow(|router| {
        router
            .get_assets()
            .get(format!("/{INDEX_HTML_PATH}"), None, None)
            .cloned()
            .expect("index.html must be certified")
    })
}

/// Certifies `page` on the proposal's path and updates the certified data.
fn certify_proposal_page(proposal_id: u64, page: String) {
    let headers = index_html_headers();

    ASSET_ROUTER.with_borrow_mut(|router| {
        PROPOSAL_PAGE_IDS.with_borrow_mut(|proposal_ids| {
            if let Err(err) = insert_proposal_page(router, proposal_ids, proposal_id, page, headers)
            {
                ic_cdk::println!("Failed to certify the page of proposal {proposal_id}: {err}");
            }
        });
        ic_cdk::api::certified_data_set(router.root_hash());
    });
}

/// Adds `page` to `router` on the proposal's path.
/// If the cache is full, it first removes the oldest proposal page.
fn insert_proposal_page(
    router: &mut AssetRouter<'static>,
    proposal_ids: &mut VecDeque<u64>,
    proposal_id: u64,
    page: String,
    headers: Vec<HeaderField>,
) -> Result<(), AssetCertificationError> {
    if proposal_ids.contains(&proposal_id) {
        return Ok(());
    }
    if proposal_ids.len() >= MAX_PROPOSAL_PAGES {
        if let Some(oldest_id) = proposal_ids.pop_front() {
            let oldest_path = proposal_preview::proposal_path(oldest_id);
            router.delete_assets_by_path([oldest_path.as_str()]);
        }
    }

    let path = proposal_preview::proposal_path(proposal_id);
    let config = AssetConfig::File {
        path: path.clone(),
        content_type: Some("text/html".to_string()),
        headers,
        fallback_for: vec![],
        aliased_by: vec![],
        encodings: vec![],
    };
    router.certify_assets([Asset::new(path, page.into_bytes())], [config])?;
    proposal_ids.push_back(proposal_id);
    Ok(())
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

/// Returns the headers of `index.html` and of the proposal pages.
fn index_html_headers() -> Vec<HeaderField> {
    // Sets a cookie so the frontend can identify which canister it's talking to
    let canister_id_cookie_header: HeaderField = (
        "set-cookie".to_string(),
        format!("canisterId={}", ic_cdk::api::canister_self().to_text()),
    );

    get_asset_headers(vec![
        (
            CACHE_CONTROL_HEADER.to_string(),
            NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
        ),
        canister_id_cookie_header,
    ])
}

/// Returns the configs for the well-known files for Internet Identity alternative origins.
/// The first matching config applies, so the File config comes before the Pattern config.
fn well_known_asset_configs() -> Vec<AssetConfig> {
    vec![
        AssetConfig::File {
            path: format!("{WELL_KNOWN_PATH}/{II_ALTERNATIVE_ORIGINS_FILE_NAME}"),
            content_type: Some("application/json".to_string()),
            headers: well_known_asset_headers(),
            fallback_for: vec![],
            aliased_by: vec![],
            encodings: vec![],
        },
        AssetConfig::Pattern {
            pattern: format!("{WELL_KNOWN_PATH}/*"),
            content_type: None,
            headers: well_known_asset_headers(),
            encodings: vec![],
        },
    ]
}

/// Generates asset configurations defining content-type, caching, and encoding rules per file type.
fn generate_default_asset_configs() -> Vec<AssetConfig> {
    // Text-based assets benefit from compression
    let text_encodings = vec![
        AssetEncoding::Brotli.default_config(),
        AssetEncoding::Gzip.default_config(),
    ];

    let mut asset_configs = vec![
        // index.html: No caching (content changes on deploys), serves as SPA fallback for all routes
        AssetConfig::File {
            path: INDEX_HTML_PATH.to_string(),
            content_type: Some("text/html".to_string()),
            headers: index_html_headers(),
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
        // robots.txt: no caching (the path is not content-hashed). Must come before `**/*.txt`.
        AssetConfig::File {
            path: "robots.txt".to_string(),
            content_type: Some("text/plain".to_string()),
            headers: get_asset_headers(vec![(
                CACHE_CONTROL_HEADER.to_string(),
                NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            fallback_for: vec![],
            aliased_by: vec![],
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
            pattern: "**/*.jpg".to_string(),
            content_type: Some("image/jpeg".to_string()),
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
    ];
    asset_configs.extend(well_known_asset_configs());
    asset_configs
}

#[cfg(test)]
mod tests {
    use super::*;

    fn serve_well_known_asset(url: &str) -> HttpResponse<'static> {
        // Same path format as `collect_files_recursive` gives from `include_dir`.
        let assets = vec![
            Asset::new(
                ".well-known/ic-domains",
                b"nns.internetcomputer.org".as_slice(),
            ),
            Asset::new(".well-known/ii-alternative-origins", b"{}".as_slice()),
        ];
        let mut router = AssetRouter::default();
        router
            .certify_assets(assets, well_known_asset_configs())
            .unwrap();
        router
            .serve_asset(&[], &HttpRequest::get(url).build())
            .unwrap()
    }

    fn header<'a>(response: &'a HttpResponse, name: &str) -> Option<&'a str> {
        response
            .headers()
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }

    #[test]
    fn well_known_assets_get_no_cache_and_cors_headers() {
        for url in [
            "/.well-known/ic-domains",
            "/.well-known/ii-alternative-origins",
        ] {
            let response = serve_well_known_asset(url);

            assert_eq!(response.status_code(), StatusCode::OK, "{url}");
            assert_eq!(
                header(&response, CACHE_CONTROL_HEADER),
                Some(NO_CACHE_ASSET_CACHE_CONTROL),
                "{url}"
            );
            assert_eq!(
                header(&response, ACCESS_CONTROL_ALLOW_ORIGIN_HEADER),
                Some("*"),
                "{url}"
            );
        }
    }

    #[test]
    fn ii_alternative_origins_is_json() {
        let response = serve_well_known_asset("/.well-known/ii-alternative-origins");

        assert_eq!(header(&response, "content-type"), Some("application/json"));
    }

    const INDEX_HTML_BODY: &[u8] = b"index";
    /// One more page than the cache keeps.
    const NEWEST_PROPOSAL_ID: u64 = MAX_PROPOSAL_PAGES as u64 + 1;

    /// Certifies `index.html` as the fallback for all paths, as `generate_default_asset_configs` does.
    fn certify_index_html() {
        let config = AssetConfig::File {
            path: INDEX_HTML_PATH.to_string(),
            content_type: Some("text/html".to_string()),
            headers: vec![],
            fallback_for: vec![AssetFallbackConfig {
                scope: "/".to_string(),
                status_code: Some(StatusCode::OK),
            }],
            aliased_by: vec![],
            encodings: vec![],
        };
        ASSET_ROUTER.with_borrow_mut(|router| {
            router
                .certify_assets([Asset::new(INDEX_HTML_PATH, INDEX_HTML_BODY)], [config])
                .unwrap();
        });
    }

    fn add_proposal_pages(proposal_ids: impl IntoIterator<Item = u64>) {
        ASSET_ROUTER.with_borrow_mut(|router| {
            PROPOSAL_PAGE_IDS.with_borrow_mut(|cached_ids| {
                for proposal_id in proposal_ids {
                    let page = format!("page {proposal_id}");
                    insert_proposal_page(router, cached_ids, proposal_id, page, vec![]).unwrap();
                }
            });
        });
    }

    fn proposal_request(proposal_id: u64) -> HttpRequest<'static> {
        HttpRequest::get(proposal_preview::proposal_path(proposal_id)).build()
    }

    /// `serve_asset` fails if the page has no entry in the certification tree.
    fn serve_proposal_page(proposal_id: u64) -> HttpResponse<'static> {
        let response = ASSET_ROUTER.with_borrow(|router| {
            router
                .serve_asset(&[], &proposal_request(proposal_id))
                .unwrap()
        });
        assert!(header(&response, "ic-certificate").is_some_and(|proof| proof.contains("tree=")));
        response
    }

    fn assert_serves_the_proposal_page(proposal_id: u64) {
        assert!(!needs_proposal_page(&proposal_request(proposal_id)));
        assert_eq!(
            serve_proposal_page(proposal_id).body(),
            format!("page {proposal_id}").as_bytes()
        );
    }

    fn assert_serves_index_html(proposal_id: u64) {
        assert!(needs_proposal_page(&proposal_request(proposal_id)));
        assert_eq!(serve_proposal_page(proposal_id).body(), INDEX_HTML_BODY);
    }

    #[test]
    fn a_full_cache_replaces_the_oldest_proposal_page() {
        certify_index_html();

        add_proposal_pages(1..=NEWEST_PROPOSAL_ID);

        PROPOSAL_PAGE_IDS.with_borrow(|proposal_ids| {
            assert_eq!(proposal_ids.len(), MAX_PROPOSAL_PAGES);
            assert_eq!(proposal_ids.front(), Some(&2));
        });
        assert_serves_index_html(1);
        assert_serves_the_proposal_page(2);
        assert_serves_the_proposal_page(NEWEST_PROPOSAL_ID);
    }

    #[test]
    fn a_removed_proposal_page_can_come_back() {
        certify_index_html();
        add_proposal_pages(1..=NEWEST_PROPOSAL_ID);

        add_proposal_pages([1]);

        PROPOSAL_PAGE_IDS.with_borrow(|proposal_ids| {
            assert_eq!(proposal_ids.len(), MAX_PROPOSAL_PAGES);
        });
        assert_serves_the_proposal_page(1);
        assert_serves_index_html(2);
    }

    #[test]
    fn a_certified_proposal_page_is_not_added_twice() {
        certify_index_html();

        add_proposal_pages([1, 1]);

        PROPOSAL_PAGE_IDS.with_borrow(|proposal_ids| assert_eq!(proposal_ids.len(), 1));
        assert_serves_the_proposal_page(1);
    }

    fn range_request(path: impl Into<String>, range: &str) -> HttpRequest<'static> {
        HttpRequest::get(path)
            .with_headers(vec![("Range".to_string(), range.to_string())])
            .build()
    }

    fn serve_range_request(request: &HttpRequest<'static>) -> HttpResponse<'static> {
        ASSET_ROUTER.with_borrow(|router| {
            router
                .serve_asset(&[], &without_unusable_range(router, request))
                .unwrap()
        })
    }

    #[test]
    fn a_range_request_gets_the_whole_proposal_page() {
        certify_index_html();
        add_proposal_pages([1]);
        let request = range_request(proposal_preview::proposal_path(1), "bytes=0-32768");

        let response = serve_range_request(&request);

        assert_eq!(response.status_code(), StatusCode::OK);
        assert_eq!(response.body(), b"page 1");
    }

    #[test]
    fn a_range_request_gets_the_requested_chunk_of_a_chunked_asset() {
        const CHUNK_SIZE: usize = 2_000_000;
        let path = "video.mp4";
        let config = AssetConfig::File {
            path: path.to_string(),
            content_type: Some("video/mp4".to_string()),
            headers: vec![],
            fallback_for: vec![],
            aliased_by: vec![],
            encodings: vec![],
        };
        let content = vec![0; CHUNK_SIZE + 1];
        ASSET_ROUTER.with_borrow_mut(|router| {
            router
                .certify_assets([Asset::new(path, content)], [config])
                .unwrap();
        });
        let request = range_request(format!("/{path}"), &format!("bytes={CHUNK_SIZE}-"));

        let response = serve_range_request(&request);

        assert_eq!(response.status_code(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(response.body().len(), 1);
    }

    #[test]
    fn a_post_request_never_needs_a_proposal_page() {
        let request = HttpRequest::post(proposal_preview::proposal_path(1)).build();

        assert!(!needs_proposal_page(&request));
    }
}
