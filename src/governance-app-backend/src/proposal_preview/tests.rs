use super::governance_client::{
    testing, ListProposalInfoRequest, ListProposalInfoResponse, Proposal, ProposalId, ProposalInfo,
};
use super::*;

/// The source of the served `index.html`, so the tests fail if its head tags change shape.
const INDEX_HTML: &str = include_str!("../../../governance-app-frontend/index.html");
const GENERIC_DESCRIPTION: &str = "Participate in decentralized governance on the Internet Computer. Lock ICP, vote on proposals, and mint rewards.";

fn proposal_info(id: u64, title: Option<&str>, summary: &str) -> ProposalInfo {
    ProposalInfo {
        id: Some(ProposalId { id }),
        proposal: Some(Proposal {
            title: title.map(str::to_string),
            summary: summary.to_string(),
        }),
    }
}

fn list_proposals_response(proposal_info: Vec<ProposalInfo>) -> ListProposalInfoResponse {
    ListProposalInfoResponse { proposal_info }
}

#[test]
fn test_parse_proposal_id_accepts_canonical_ids() {
    assert_eq!(parse_proposal_id("/voting/proposals/1"), Some(1));
    assert_eq!(parse_proposal_id("/voting/proposals/139000"), Some(139_000));
    assert_eq!(
        parse_proposal_id(&format!("/voting/proposals/{}", u64::MAX)),
        Some(u64::MAX)
    );
}

#[test]
fn test_parse_proposal_id_rejects_other_paths() {
    for path in [
        "/",
        "/voting",
        "/voting/proposals",
        "/voting/proposals/",
        "/voting/proposals/0",
        "/voting/proposals/007",
        "/voting/proposals/+7",
        "/voting/proposals/-7",
        "/voting/proposals/7/",
        "/voting/proposals/7/votes",
        "/voting/proposals/abc",
        "/voting/proposals/18446744073709551616",
        "/stakes/proposals/7",
    ] {
        assert_eq!(parse_proposal_id(path), None, "{path}");
    }
}

#[test]
fn test_strip_markdown() {
    let markdown = "Release Notes for [**release-2025-10-17\\_03-17-base**](https://github.com/dfinity/ic/tree/release-2025-10-17_03-17-base) (286295f)\n\
        ==========\n\
        \n\
        ## Features\n\
        - Add `foo` to the *bar* ![logo](https://example.com/logo.png)\n\
        1. Keep \\*literal\\* asterisks\n\
        > A <b>quote</b>\n\
        ```rust\n\
        let x = 1;\n\
        ```\n\
        ---";

    assert_eq!(
        strip_markdown(markdown),
        "Release Notes for release-2025-10-17_03-17-base (286295f) Features Add foo to the bar logo Keep *literal* asterisks A quote let x = 1;"
    );
}

#[test]
fn test_strip_markdown_keeps_comparisons() {
    assert_eq!(
        strip_markdown("Fees < 1 ICP and > 0"),
        "Fees < 1 ICP and > 0"
    );
}

#[test]
fn test_strip_markdown_decodes_entities() {
    assert_eq!(
        strip_markdown(
            "Budget &lt; 10 ICP &amp; retain&nbsp;reserves &#169; &#x1F600; &copy; &#0;"
        ),
        "Budget < 10 ICP & retain reserves © 😀 &copy; &#0;"
    );
}

#[test]
fn test_strip_markdown_keeps_entities_in_code() {
    assert_eq!(
        strip_markdown("Use `&lt;br&gt;` &amp;\n```\n&amp; in a block\n```\nend &gt;"),
        "Use &lt;br&gt; & &amp; in a block end >"
    );
}

#[test]
fn test_strip_markdown_keeps_code_text() {
    assert_eq!(
        strip_markdown("Use `Vec<T>` for this API. Match `a*b` and `\\_x` literally."),
        "Use Vec<T> for this API. Match a*b and \\_x literally."
    );
    assert_eq!(
        strip_markdown("Run:\n```sh\nmake <target> **all**\n```"),
        "Run: make <target> **all**"
    );
}

#[test]
fn test_strip_markdown_keeps_inline_code_with_three_backticks() {
    assert_eq!(
        strip_markdown("Use ```Vec<T>``` or ``a`b`` for this API."),
        "Use Vec<T> or a`b for this API."
    );
}

#[test]
fn test_strip_markdown_keeps_markers_between_spaces() {
    assert_eq!(
        strip_markdown("Fee multiplier: 2 * 3 ICP, a ** b, and *bold* text."),
        "Fee multiplier: 2 * 3 ICP, a ** b, and bold text."
    );
}

#[test]
fn test_strip_markdown_keeps_unmatched_markers() {
    for text in [
        "Raise the limit to 2*3 ICP.",
        "Keep snake__case__name as is.",
        "Keep * a and b * with spaces inside.",
    ] {
        assert_eq!(strip_markdown(text), text);
    }
    assert_eq!(strip_markdown("Keep \\*a* as is."), "Keep *a* as is.");
}

#[test]
fn test_strip_markdown_removes_nested_emphasis() {
    assert_eq!(
        strip_markdown("***Both*** and ~~old~~ and __strong__ and *`code`*"),
        "Both and old and strong and code"
    );
}

#[test]
fn test_strip_markdown_keeps_encoded_markdown_markers() {
    assert_eq!(
        strip_markdown("Fee multiplier: 2 &#42; 3 ICP.\n&gt; 5 &#35; and &#96;x&#96;"),
        "Fee multiplier: 2 * 3 ICP. > 5 # and `x`"
    );
}

#[test]
fn test_strip_markdown_keeps_autolink_text() {
    assert_eq!(
        strip_markdown("See <https://example.com/a?b=1>."),
        "See https://example.com/a?b=1."
    );
    assert_eq!(
        strip_markdown("Contact <team@example.org> or <ipfs://bafyexample>, not <b>bold</b>."),
        "Contact team@example.org or ipfs://bafyexample, not bold ."
    );
}

#[test]
fn test_render_page_with_an_autolink_summary() {
    let page = render_page(INDEX_HTML, 8, None, "<https://forum.dfinity.org/t/1>");

    assert_eq!(
        meta_content(&page, "og:description").as_deref(),
        Some("https://forum.dfinity.org/t/1")
    );
}

#[test]
fn test_render_page_escapes_decoded_entities_once() {
    let page = render_page(
        INDEX_HTML,
        3,
        None,
        "Budget &lt; 10 ICP &amp; retain reserves.",
    );

    assert_eq!(
        meta_content(&page, "og:description").as_deref(),
        Some("Budget &lt; 10 ICP &amp; retain reserves.")
    );
}

#[test]
fn test_truncate_keeps_short_text() {
    assert_eq!(truncate("Short text", 160), "Short text");
}

#[test]
fn test_truncate_cuts_at_a_word_boundary() {
    assert_eq!(truncate("one two three four", 12), "one two…");
}

#[test]
fn test_truncate_cuts_a_long_word() {
    assert_eq!(truncate("abcdefghijklmnop", 8), "abcdefg…");
}

#[test]
fn test_truncate_counts_characters_not_bytes() {
    let text = "é".repeat(200);
    let truncated = truncate(&text, 160);
    assert_eq!(truncated.chars().count(), 160);
    assert!(truncated.ends_with('…'));
}

#[test]
fn test_summary_excerpt_removes_a_leading_title() {
    assert_eq!(
        summary_excerpt(
            Some("Upgrade the governance canister"),
            "# Upgrade the Governance Canister\n\nThis upgrade adds a feature."
        ),
        "This upgrade adds a feature."
    );
}

#[test]
fn test_summary_excerpt_removes_a_leading_title_with_markup() {
    assert_eq!(
        summary_excerpt(
            Some("Test `<tags>` & more"),
            "# Test `<tags>` & more\n\nThis motion asks a question."
        ),
        "This motion asks a question."
    );
}

#[test]
fn test_summary_excerpt_keeps_a_title_that_ends_inside_a_word() {
    assert_eq!(
        summary_excerpt(
            Some("Increase stake"),
            "Increase stakes to improve network security."
        ),
        "Increase stakes to improve network security."
    );
}

#[test]
fn test_summary_excerpt_keeps_a_summary_that_is_only_the_title() {
    assert_eq!(summary_excerpt(Some("Motion"), "# Motion"), "Motion");
}

#[test]
fn test_escape_html() {
    assert_eq!(
        escape_html(r#"<a href="x">Tom & Jerry's</a>"#),
        "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;"
    );
}

#[test]
fn test_render_page_sets_the_link_preview_tags() {
    let page = render_page(
        INDEX_HTML,
        139_000,
        Some("Elect new IC/HostOS revision"),
        "This proposal elects a new **revision**.",
    );

    let card_title = "Proposal #139000: Elect new IC/HostOS revision";
    let description = "This proposal elects a new revision.";
    assert_eq!(
        TITLE_TAG.captures(&page).unwrap()[0].to_string(),
        format!("<title data-static-head>{card_title} | Network Nervous System</title>")
    );
    for (key, value) in [
        ("og:title", card_title),
        ("twitter:title", card_title),
        ("description", description),
        ("og:description", description),
        ("twitter:description", description),
        ("og:url", "https://nns.icp.net/voting/proposals/139000"),
    ] {
        assert_eq!(meta_content(&page, key).as_deref(), Some(value), "{key}");
    }
    assert!(!page.contains(GENERIC_DESCRIPTION));
    assert!(!page.contains("ICP governance &amp; voting"));
}

#[test]
fn test_render_page_keeps_the_other_tags() {
    let page = render_page(INDEX_HTML, 1, Some("Title"), "Summary");

    for key in [
        "og:type",
        "og:site_name",
        "og:image",
        "twitter:card",
        "twitter:image",
    ] {
        assert_eq!(
            meta_content(&page, key),
            meta_content(INDEX_HTML, key),
            "{key}"
        );
    }
    let (_, index_body) = INDEX_HTML.split_once("</head>").unwrap();
    let (_, page_body) = page.split_once("</head>").unwrap();
    assert_eq!(page_body, index_body);
}

#[test]
fn test_render_page_escapes_html() {
    let page = render_page(
        INDEX_HTML,
        7,
        Some(r#"Fix "<script>" & more"#),
        "Use $1 and </title>",
    );

    let escaped_title = "Proposal #7: Fix &quot;&lt;script&gt;&quot; &amp; more";
    assert_eq!(
        meta_content(&page, "og:title").as_deref(),
        Some(escaped_title)
    );
    assert_eq!(
        meta_content(&page, "og:description").as_deref(),
        Some("Use $1 and")
    );
    assert!(!page.contains("<script>\""));
}

#[test]
fn test_render_page_without_title_and_summary() {
    let page = render_page(INDEX_HTML, 42, None, "  ");

    assert_eq!(
        meta_content(&page, "og:title").as_deref(),
        Some("Proposal #42")
    );
    assert_eq!(
        meta_content(&page, "og:description").as_deref(),
        Some(GENERIC_DESCRIPTION)
    );
    assert_eq!(
        meta_content(&page, "description").as_deref(),
        Some(GENERIC_DESCRIPTION)
    );
}

#[tokio::test]
async fn test_render_proposal_page_fetches_the_proposal() {
    testing::add_list_proposals_response(Ok(list_proposals_response(vec![proposal_info(
        5,
        Some("Title"),
        "Summary",
    )])));

    let page = render_proposal_page(INDEX_HTML, 5).await.unwrap();

    assert_eq!(
        testing::drain_requests(),
        vec![ListProposalInfoRequest {
            before_proposal: Some(ProposalId { id: 6 }),
            limit: 1,
            omit_large_fields: Some(true),
            include_all_manage_neuron_proposals: Some(true),
            ..Default::default()
        }]
    );
    assert_eq!(
        meta_content(&page, "og:title").as_deref(),
        Some("Proposal #5: Title")
    );
}

#[tokio::test]
async fn test_render_proposal_page_returns_none_for_an_unknown_proposal() {
    // Without proposal 5, `list_proposals` returns the next older proposal.
    testing::add_list_proposals_response(Ok(list_proposals_response(vec![proposal_info(
        4,
        Some("Title"),
        "Summary",
    )])));
    testing::add_list_proposals_response(Ok(list_proposals_response(vec![])));
    testing::add_list_proposals_response(Ok(list_proposals_response(vec![ProposalInfo {
        id: Some(ProposalId { id: 7 }),
        proposal: None,
    }])));

    assert_eq!(render_proposal_page(INDEX_HTML, 5).await, None);
    assert_eq!(render_proposal_page(INDEX_HTML, 6).await, None);
    assert_eq!(render_proposal_page(INDEX_HTML, 7).await, None);
    assert_eq!(testing::drain_requests().len(), 3);
}

#[tokio::test]
async fn test_render_proposal_page_for_the_largest_id_lists_the_latest_proposal() {
    testing::add_list_proposals_response(Ok(list_proposals_response(vec![proposal_info(
        10,
        Some("Title"),
        "Summary",
    )])));

    assert_eq!(render_proposal_page(INDEX_HTML, u64::MAX).await, None);
    assert_eq!(testing::drain_requests()[0].before_proposal, None);
}

#[tokio::test]
async fn test_render_proposal_page_returns_none_on_a_call_error() {
    testing::add_list_proposals_response(Err("canister is stopped".to_string()));

    assert_eq!(render_proposal_page(INDEX_HTML, 5).await, None);
    assert_eq!(testing::drain_requests().len(), 1);
}
