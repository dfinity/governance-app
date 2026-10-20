//! Link preview tags for shared proposal links.
//!
//! Crawlers do not run JavaScript. For `/voting/proposals/<id>`, the canister writes the proposal
//! title and the start of its summary into the head tags of `index.html`.
//! Title and summary never change after submission, so a rendered page never goes stale.

mod governance_client;

#[cfg(test)]
mod tests;

use regex::{Captures, NoExpand, Regex};
use std::{borrow::Cow, sync::LazyLock};

const PROPOSAL_PATH_PREFIX: &str = "/voting/proposals/";
const APP_NAME: &str = "Network Nervous System";
/// Link previews show about two lines of description.
const MAX_DESCRIPTION_CHARS: usize = 160;

static TITLE_TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)(<title\b[^>]*>).*?(</title>)").unwrap());
static META_TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<meta\b[^>]*>").unwrap());
static META_KEY_ATTR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\b(?:name|property)="([^"]*)""#).unwrap());
static META_CONTENT_ATTR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\bcontent="([^"]*)""#).unwrap());

/// Code blocks (without the fence lines) and code spans of one to three backticks.
/// Their text is literal.
static MARKDOWN_CODE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(concat!(
        r"(?m)^[ \t]*```[^\n]*\n((?s:.*?))^[ \t]*```[ \t]*$",
        r"|^[ \t]*~~~[^\n]*\n((?s:.*?))^[ \t]*~~~[ \t]*$",
        r"|```([^\n]+?)```|``([^\n]+?)``|`([^`\n]*)`",
    ))
    .unwrap()
});
/// Stands for the code at an index while the other passes run.
const CODE_START: char = '\u{E000}';
const CODE_END: char = '\u{E001}';
static CODE_PLACEHOLDER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\x{E000}(\d+)\x{E001}").unwrap());
static MARKDOWN_IMAGE_OR_LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!?\[([^\]]*)\]\([^)]*\)").unwrap());
static MARKDOWN_AUTOLINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<((?:https?|ftp|mailto):[^<>\s]*)>").unwrap());
static HTML_TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"</?[a-zA-Z][^>]*>").unwrap());
/// Horizontal rules and setext heading underlines.
static MARKDOWN_RULE_LINE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?m)^[ \t]*(?:[-=*_][ \t]*){3,}$").unwrap());
static HTML_ENTITY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"&(?:#([0-9]{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]+));").unwrap()
});
/// Heading, quote, and list markers at the start of a line.
static MARKDOWN_LINE_PREFIX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^[ \t]*(?:#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+|\d+[.)][ \t]+)").unwrap()
});
/// Emphasis markers and unmatched backticks. A backslash before a marker, or whitespace on both
/// sides of it, keeps the marker as text.
static MARKDOWN_EMPHASIS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\\?)(\*\*|__|~~|\*|`)").unwrap());
static MARKDOWN_ESCAPE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\\([\\`*_{}\[\]()#+\-.!|<>~])").unwrap());
static WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Returns the proposal ID of a `/voting/proposals/<id>` path.
/// Returns `None` for other paths, for ID 0, and for IDs that are not in canonical form
/// (for example `007` or `+7`), so that each proposal has one page.
pub fn parse_proposal_id(path: &str) -> Option<u64> {
    let id_text = path.strip_prefix(PROPOSAL_PATH_PREFIX)?;
    let id = id_text.parse::<u64>().ok()?;
    (id > 0 && id.to_string() == id_text).then_some(id)
}

pub fn proposal_path(proposal_id: u64) -> String {
    format!("{PROPOSAL_PATH_PREFIX}{proposal_id}")
}

/// Fetches the proposal from NNS governance and returns `index_html` with its link preview tags.
/// Returns `None` and logs the reason if the proposal does not exist or the call fails.
pub async fn render_proposal_page(index_html: &str, proposal_id: u64) -> Option<String> {
    let proposal = match governance_client::get_proposal_info(proposal_id).await {
        Ok(Some(governance_client::ProposalInfo {
            proposal: Some(proposal),
            ..
        })) => proposal,
        Ok(_) => {
            ic_cdk::println!("No link preview for proposal {proposal_id}: proposal not found");
            return None;
        }
        Err(err) => {
            ic_cdk::println!("No link preview for proposal {proposal_id}: call error: {err}");
            return None;
        }
    };

    Some(render_page(
        index_html,
        proposal_id,
        proposal.title.as_deref(),
        &proposal.summary,
    ))
}

/// Writes the proposal title and the start of its summary into the head tags of `index_html`.
/// If the summary has no text, the generic description stays.
fn render_page(index_html: &str, proposal_id: u64, title: Option<&str>, summary: &str) -> String {
    let title = title.map(str::trim).filter(|title| !title.is_empty());
    let card_title = match title {
        Some(title) => format!("Proposal #{proposal_id}: {title}"),
        None => format!("Proposal #{proposal_id}"),
    };
    let page_title = format!("{card_title} | {APP_NAME}");
    let description = summary_excerpt(title, summary);
    let page_url = meta_content(index_html, "og:url").map(|origin_url| {
        format!(
            "{}{}",
            origin_url.trim_end_matches('/'),
            proposal_path(proposal_id)
        )
    });

    let mut meta_values = vec![
        ("og:title", card_title.as_str()),
        ("twitter:title", card_title.as_str()),
    ];
    if let Some(page_url) = &page_url {
        meta_values.push(("og:url", page_url));
    }
    if !description.is_empty() {
        meta_values.extend([
            ("description", description.as_str()),
            ("og:description", description.as_str()),
            ("twitter:description", description.as_str()),
        ]);
    }

    let html = TITLE_TAG.replace(index_html, |caps: &Captures| {
        format!("{}{}{}", &caps[1], escape_html(&page_title), &caps[2])
    });
    META_TAG
        .replace_all(&html, |caps: &Captures| {
            let tag = &caps[0];
            let value = META_KEY_ATTR.captures(tag).and_then(|key| {
                meta_values
                    .iter()
                    .find(|(name, _)| *name == &key[1])
                    .map(|(_, value)| *value)
            });
            match value {
                Some(value) => {
                    let content = format!(r#"content="{}""#, escape_html(value));
                    META_CONTENT_ATTR
                        .replace(tag, NoExpand(&content))
                        .into_owned()
                }
                None => tag.to_string(),
            }
        })
        .into_owned()
}

/// Returns the `content` of the first meta tag with the given `name` or `property`.
fn meta_content(html: &str, key: &str) -> Option<String> {
    META_TAG.find_iter(html).find_map(|tag| {
        let tag = tag.as_str();
        let tag_key = META_KEY_ATTR.captures(tag)?;
        if &tag_key[1] != key {
            return None;
        }
        META_CONTENT_ATTR
            .captures(tag)
            .map(|content| content[1].to_string())
    })
}

/// Returns the summary as plain text, cut to `MAX_DESCRIPTION_CHARS`.
/// Many summaries start with the title, so a leading copy of the title is removed.
/// The copy must end at a word boundary.
fn summary_excerpt(title: Option<&str>, summary: &str) -> String {
    let text = strip_markdown(summary);
    let title = title.map(strip_markdown);
    let text = title
        .as_deref()
        .filter(|title| !title.is_empty())
        .and_then(|title| strip_prefix_ignore_ascii_case(&text, title))
        .filter(|rest| rest.chars().next().is_none_or(|c| !c.is_alphanumeric()))
        .map(|rest| rest.trim_start_matches(|c: char| c.is_whitespace() || ":.-".contains(c)))
        .filter(|rest| !rest.is_empty())
        .unwrap_or(&text);
    truncate(text, MAX_DESCRIPTION_CHARS)
}

fn strip_prefix_ignore_ascii_case<'a>(text: &'a str, prefix: &str) -> Option<&'a str> {
    let head = text.get(..prefix.len())?;
    head.eq_ignore_ascii_case(prefix)
        .then(|| &text[prefix.len()..])
}

/// Converts markdown to plain text on one line. Keeps the text of code, links, and images.
fn strip_markdown(markdown: &str) -> String {
    let mut code_texts = Vec::new();
    let text = MARKDOWN_CODE.replace_all(markdown, |caps: &Captures| {
        let code = (1..=5)
            .find_map(|group| caps.get(group))
            .map_or("", |m| m.as_str());
        code_texts.push(code.to_string());
        format!("{CODE_START}{}{CODE_END}", code_texts.len() - 1)
    });
    let text = MARKDOWN_IMAGE_OR_LINK.replace_all(&text, "$1");
    let text = MARKDOWN_AUTOLINK.replace_all(&text, "$1");
    let text = HTML_TAG.replace_all(&text, " ");
    let text = MARKDOWN_RULE_LINE.replace_all(&text, "");
    let text = MARKDOWN_LINE_PREFIX.replace_all(&text, "");
    let haystack: &str = &text;
    let text = MARKDOWN_EMPHASIS.replace_all(haystack, |caps: &Captures| {
        let whole = caps.get(0).unwrap();
        let is_space = |c: Option<char>| c.is_none_or(char::is_whitespace);
        let is_literal = is_space(haystack[..whole.start()].chars().next_back())
            && is_space(haystack[whole.end()..].chars().next());
        if caps[1].is_empty() && !is_literal {
            String::new()
        } else {
            caps[2].to_string()
        }
    });
    let text = MARKDOWN_ESCAPE.replace_all(&text, "$1");
    // After the markdown passes, so that a decoded character stays as text.
    let text = decode_entities(&text);
    let text = CODE_PLACEHOLDER.replace_all(&text, |caps: &Captures| {
        caps[1]
            .parse::<usize>()
            .ok()
            .and_then(|index| code_texts.get(index))
            .cloned()
            .unwrap_or_default()
    });
    WHITESPACE.replace_all(&text, " ").trim().to_string()
}

/// Decodes numeric entities and the common named entities. Other entities stay as text.
fn decode_entities(text: &str) -> Cow<'_, str> {
    HTML_ENTITY.replace_all(text, |caps: &Captures| {
        let decoded = if let Some(decimal) = caps.get(1) {
            decimal.as_str().parse().ok().and_then(char::from_u32)
        } else if let Some(hex) = caps.get(2) {
            u32::from_str_radix(hex.as_str(), 16)
                .ok()
                .and_then(char::from_u32)
        } else {
            match &caps[3] {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                "nbsp" => Some(' '),
                _ => None,
            }
        };
        decoded
            .filter(|c| *c != '\0')
            .map_or_else(|| caps[0].to_string(), String::from)
    })
}

/// Cuts `text` to at most `max_chars` characters, at a word boundary if one is close.
/// Adds an ellipsis if it cuts the text.
fn truncate(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    let cut: String = text.chars().take(max_chars - 1).collect();
    let cut = match cut.rfind(' ') {
        Some(space) if space >= cut.len() / 2 => &cut[..space],
        _ => cut.as_str(),
    };
    format!("{}…", cut.trim_end())
}

fn escape_html(text: &str) -> String {
    let mut escaped = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => escaped.push_str("&amp;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            '"' => escaped.push_str("&quot;"),
            '\'' => escaped.push_str("&#39;"),
            _ => escaped.push(c),
        }
    }
    escaped
}
