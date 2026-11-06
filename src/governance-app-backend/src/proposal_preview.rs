//! Link preview tags for shared proposal links.
//!
//! Crawlers do not run JavaScript. For `/voting/proposals/<id>`, the canister writes the proposal
//! title, the start of its summary, its topic, and its submission date into the head tags of
//! `index.html`. These values never change after submission, so a rendered page never goes stale.

mod governance_client;

#[cfg(test)]
mod tests;

use regex::{Captures, NoExpand, Regex};
use std::{borrow::Cow, sync::LazyLock};

const PROPOSAL_PATH_PREFIX: &str = "/voting/proposals/";
const APP_NAME: &str = "Network Nervous System";
/// Link previews show about two lines of description.
const MAX_DESCRIPTION_CHARS: usize = 160;
/// The length of a short commit hash.
const SHORT_HASH_CHARS: usize = 7;
/// A period in these does not end a sentence.
const ABBREVIATIONS: [&str; 2] = ["e.g.", "i.e."];
const SECONDS_PER_DAY: u64 = 86_400;
const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

static TITLE_TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)(<title\b[^>]*>).*?(</title>)").unwrap());
static META_TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<meta\b[^>]*>").unwrap());
static META_KEY_ATTR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\b(?:name|property)="([^"]*)""#).unwrap());
static META_CONTENT_ATTR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"\bcontent="([^"]*)""#).unwrap());

/// Code blocks (without the fence lines), code spans of one to three backticks, and escaped
/// characters. Their text is literal.
static MARKDOWN_LITERAL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(concat!(
        r"(?m)^[ \t]*```[^\n]*\n((?s:.*?))^[ \t]*```[ \t]*$",
        r"|^[ \t]*~~~[^\n]*\n((?s:.*?))^[ \t]*~~~[ \t]*$",
        r"|```([^\n]+?)```|``([^\n]+?)``|`([^`\n]*)`",
        r"|\\([\\`*_{}\[\]()#+\-.!|<>~])",
    ))
    .unwrap()
});
/// Stands for the literal text at an index while the other passes run.
const LITERAL_START: char = '\u{E000}';
const LITERAL_END: char = '\u{E001}';
static LITERAL_PLACEHOLDER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\x{E000}(\d+)\x{E001}").unwrap());
static MARKDOWN_IMAGE_OR_LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)").unwrap());
/// URI and email autolinks, as CommonMark defines them.
static MARKDOWN_AUTOLINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(concat!(
        r"<([a-zA-Z][a-zA-Z0-9+.\-]{1,31}:[^<>\s]*",
        r"|[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?",
        r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*)>",
    ))
    .unwrap()
});
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
/// Emphasis with a pair of delimiters next to text. Other delimiters stay as text.
static MARKDOWN_EMPHASIS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(concat!(
        r"\*\*(\S(?:[^\n]*?\S)?)\*\*|__(\S(?:[^\n]*?\S)?)__",
        r"|~~(\S(?:[^\n]*?\S)?)~~|\*(\S(?:[^*\n]*?\S)?)\*|_(\S(?:[^_\n]*?\S)?)_",
    ))
    .unwrap()
});
/// Nested emphasis such as `***text***` needs one pass for each level.
const MAX_EMPHASIS_PASSES: usize = 3;
static WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());
/// A line break inside a sentence: the next line starts in lowercase.
static SOFT_WRAP: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\n(\p{Ll})").unwrap());
/// A commit, wasm, or args hash.
static LONG_HASH: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b[0-9a-fA-F]{32,}\b").unwrap());
/// A hash in parentheses, with the spaces before it.
static PARENTHESIZED_HASH: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[ \t]*\([0-9a-fA-F]{32,}\)").unwrap());
/// A line with a short label and one value, for example `Git hash: 7cc1089`.
static METADATA_LINE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(?:\S+[ \t]+){0,3}\S+:[ \t]+\S+$").unwrap());

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
    let (proposal, topic, proposal_timestamp_seconds) =
        match governance_client::get_proposal_info(proposal_id).await {
            Ok(Some(governance_client::ProposalInfo {
                proposal: Some(proposal),
                topic,
                proposal_timestamp_seconds,
                ..
            })) => (proposal, topic, proposal_timestamp_seconds),
            Ok(_) => {
                ic_cdk::println!("No link preview for proposal {proposal_id}: proposal not found");
                return None;
            }
            Err(err) => {
                ic_cdk::println!("No link preview for proposal {proposal_id}: call error: {err}");
                return None;
            }
        };

    let page = render_page(
        index_html,
        proposal_id,
        proposal.title.as_deref(),
        &proposal.summary,
    );
    Some(add_card_fields(&page, topic, proposal_timestamp_seconds))
}

/// Writes the proposal title and the start of its summary into the head tags of `index_html`.
/// If the summary has no text, the generic description stays.
fn render_page(index_html: &str, proposal_id: u64, title: Option<&str>, summary: &str) -> String {
    let title = title.map(str::trim).filter(|title| !title.is_empty());
    // No `#` before the ID: Slack reads `#144740` as a color and adds a swatch.
    let card_title = match title {
        Some(title) => format!("Proposal {proposal_id}: {}", shorten_hashes(title)),
        None => format!("Proposal {proposal_id}"),
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

/// Adds the topic and the submission date to `page` as the label and data tags that Slack shows
/// below the description.
fn add_card_fields(page: &str, topic: i32, proposal_timestamp_seconds: u64) -> String {
    let date = format_date(proposal_timestamp_seconds);
    let fields = topic_name(topic)
        .map(|topic| ("Topic", topic))
        .into_iter()
        .chain([("Submitted", date.as_str())]);
    let tags: String = fields
        .enumerate()
        .map(|(index, (label, data))| {
            let number = index + 1;
            format!(
                "\n    <meta name=\"twitter:label{number}\" content=\"{}\" />\
                 \n    <meta name=\"twitter:data{number}\" content=\"{}\" />",
                escape_html(label),
                escape_html(data),
            )
        })
        .collect();

    let last_twitter_tag = META_TAG.find_iter(page).find(|tag| {
        META_KEY_ATTR
            .captures(tag.as_str())
            .is_some_and(|key| &key[1] == "twitter:image:alt")
    });
    match last_twitter_tag {
        Some(tag) => format!("{}{tags}{}", &page[..tag.end()], &page[tag.end()..]),
        None => page.to_string(),
    }
}

/// Returns the name of an NNS governance topic, with the same text as `voting.topics.*`.
fn topic_name(topic: i32) -> Option<&'static str> {
    match topic {
        1 => Some("Neuron Management"),
        2 => Some("Exchange Rate"),
        3 => Some("Network Economics"),
        4 => Some("Governance"),
        5 => Some("Node Admin"),
        6 => Some("Participant Management"),
        7 => Some("Subnet Management"),
        8 => Some("Application Canister Management"),
        9 => Some("KYC"),
        10 => Some("Node Provider Rewards"),
        11 => Some("SNS Decentralization Sale"),
        12 => Some("IC OS Version Deployment"),
        13 => Some("IC OS Version Election"),
        14 => Some("SNS & Neurons' Fund"),
        15 => Some("API Boundary Node Management"),
        16 => Some("Subnet Rental"),
        17 => Some("Protocol Canister Management"),
        18 => Some("Service Nervous System Management"),
        _ => None,
    }
}

/// Formats a UTC timestamp as `6 Nov 2026`.
fn format_date(timestamp_seconds: u64) -> String {
    // The civil-from-days algorithm, with years that start on 1 March.
    let days = timestamp_seconds / SECONDS_PER_DAY + 719_468;
    let era = days / 146_097;
    let day_of_era = days % 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let shifted_month = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * shifted_month + 2) / 5 + 1;
    let month_index = (shifted_month + 2) % 12;
    let year = year_of_era + era * 400 + u64::from(month_index < 2);
    format!("{day} {} {year}", MONTHS[month_index as usize])
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
    let text = plain_lines(summary);
    let title = title.map(strip_markdown);
    let text = title
        .as_deref()
        .filter(|title| !title.is_empty())
        .and_then(|title| strip_prefix_ignore_ascii_case(&text, title))
        .filter(|rest| rest.chars().next().is_none_or(|c| !c.is_alphanumeric()))
        .map(|rest| rest.trim_start_matches(|c: char| c.is_whitespace() || ":.-".contains(c)))
        .filter(|rest| !rest.is_empty())
        .unwrap_or(&text);
    let text = remove_metadata_lines(text);
    let text = SOFT_WRAP.replace_all(&text, " $1");
    let text = PARENTHESIZED_HASH.replace_all(&text, "");
    truncate(&join_lines(&shorten_hashes(&text)), MAX_DESCRIPTION_CHARS)
}

/// Removes the metadata lines. A line that wraps to the next line is prose, not metadata.
/// A summary with only metadata lines keeps them.
fn remove_metadata_lines(text: &str) -> String {
    let lines: Vec<&str> = text.lines().collect();
    let kept: Vec<&str> = lines
        .iter()
        .enumerate()
        .filter(|(index, line)| {
            let wraps = lines.get(index + 1).is_some_and(|next_line| {
                next_line.starts_with(char::is_lowercase) && !METADATA_LINE.is_match(next_line)
            });
            wraps || !METADATA_LINE.is_match(line)
        })
        .map(|(_, line)| *line)
        .collect();
    if kept.is_empty() {
        text.to_string()
    } else {
        kept.join("\n")
    }
}

/// Cuts each hash to `SHORT_HASH_CHARS`. A hash in a URL stays complete.
fn shorten_hashes(text: &str) -> Cow<'_, str> {
    LONG_HASH.replace_all(text, |caps: &Captures| {
        let hash = caps.get(0).unwrap();
        let word_start = text[..hash.start()]
            .rsplit(char::is_whitespace)
            .next()
            .unwrap_or_default();
        if word_start.contains("://") {
            hash.as_str().to_string()
        } else {
            hash.as_str()[..SHORT_HASH_CHARS].to_string()
        }
    })
}

/// Joins the lines with text into one line. A line with no punctuation at its end gets a period.
fn join_lines(text: &str) -> String {
    let mut lines = text
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .peekable();
    let mut joined = String::with_capacity(text.len());
    while let Some(line) = lines.next() {
        joined.push_str(line);
        if lines.peek().is_some() {
            if !line.ends_with(['.', ',', ':', ';', '!', '?', '…']) {
                joined.push('.');
            }
            joined.push(' ');
        }
    }
    joined
}

/// A line break in `text` matches a space in `prefix`, so a wrapped title still matches.
fn strip_prefix_ignore_ascii_case<'a>(text: &'a str, prefix: &str) -> Option<&'a str> {
    let head = text.get(..prefix.len())?.replace('\n', " ");
    head.eq_ignore_ascii_case(prefix)
        .then(|| &text[prefix.len()..])
}

/// Converts markdown to plain text on one line. Keeps the text of code, links, and images.
fn strip_markdown(markdown: &str) -> String {
    WHITESPACE
        .replace_all(&plain_lines(markdown), " ")
        .into_owned()
}

/// Converts markdown to plain text. Each line is trimmed and has text.
fn plain_lines(markdown: &str) -> String {
    let markdown = markdown.replace("\r\n", "\n");
    let mut literal_texts = Vec::new();
    let text = MARKDOWN_LITERAL.replace_all(&markdown, |caps: &Captures| {
        let literal = (1..=6)
            .find_map(|group| caps.get(group))
            .map_or("", |m| m.as_str());
        literal_texts.push(literal.to_string());
        format!("{LITERAL_START}{}{LITERAL_END}", literal_texts.len() - 1)
    });
    let text = MARKDOWN_IMAGE_OR_LINK.replace_all(&text, "$1");
    let text = MARKDOWN_AUTOLINK.replace_all(&text, "$1");
    let text = HTML_TAG.replace_all(&text, " ");
    let text = MARKDOWN_RULE_LINE.replace_all(&text, "");
    let mut text = MARKDOWN_LINE_PREFIX.replace_all(&text, "").into_owned();
    for _ in 0..MAX_EMPHASIS_PASSES {
        match strip_emphasis(&text) {
            Cow::Borrowed(_) => break,
            Cow::Owned(stripped) => text = stripped,
        }
    }
    // After the markdown passes, so that a decoded character stays as text.
    let text = decode_entities(&text);
    let text = LITERAL_PLACEHOLDER.replace_all(&text, |caps: &Captures| {
        caps[1]
            .parse::<usize>()
            .ok()
            .and_then(|index| literal_texts.get(index))
            .cloned()
            .unwrap_or_default()
    });
    text.lines()
        .map(|line| WHITESPACE.replace_all(line, " ").trim().to_string())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

/// Removes one level of emphasis delimiters. Like markdown, `_` and `__` inside a word stay as text.
fn strip_emphasis(text: &str) -> Cow<'_, str> {
    MARKDOWN_EMPHASIS.replace_all(text, |caps: &Captures| {
        let whole = caps.get(0).unwrap();
        let is_alphanumeric = |c: Option<char>| c.is_some_and(char::is_alphanumeric);
        let is_intraword_underscore = (caps.get(2).is_some() || caps.get(5).is_some())
            && (is_alphanumeric(text[..whole.start()].chars().next_back())
                || is_alphanumeric(text[whole.end()..].chars().next()));
        if is_intraword_underscore {
            return whole.as_str().to_string();
        }
        (1..=5)
            .find_map(|group| caps.get(group))
            .map_or("", |m| m.as_str())
            .to_string()
    })
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

/// Cuts `text` to at most `max_chars` characters, at the end of a sentence if one is close.
/// Otherwise cuts at a word boundary if one is close, and adds an ellipsis.
fn truncate(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    let sentences: String = text.chars().take(max_chars + 1).collect();
    let sentence_end = sentences
        .rmatch_indices(['.', '!', '?'])
        .map(|(index, _)| index + 1)
        .find(|end| {
            sentences[*end..].starts_with(' ')
                && !ABBREVIATIONS
                    .iter()
                    .any(|abbreviation| sentences[..*end].ends_with(abbreviation))
        });
    if let Some(end) = sentence_end.filter(|end| *end >= sentences.len() / 2) {
        return sentences[..end].to_string();
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
