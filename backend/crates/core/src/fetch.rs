//! Outgoing HTTP: downloads with the same limits/headers as the old axios instance and feed parsing.
use crate::{Error, Result};
use chrono::{DateTime, Utc};
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, COOKIE, USER_AGENT};
use std::time::Duration;
use url::Url;

const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
const COOKIE_VALUE: &str = "DSGVO_ZUSAGE_V1=true;cookieconsent_status=allow;waconcookiemanagement=min;";

#[derive(Clone)]
pub struct Fetcher {
    client: reqwest::Client,
    max_len: usize,
}

pub struct Fetched {
    pub final_url: Url,
    pub bytes: Vec<u8>,
    charset: Option<String>,
}

impl Fetcher {
    pub fn new(max_content_length: usize) -> Result<Self> {
        let mut h = HeaderMap::new();
        h.insert(USER_AGENT, HeaderValue::from_static(UA));
        h.insert(COOKIE, HeaderValue::from_static(COOKIE_VALUE));
        let client = reqwest::Client::builder()
            .default_headers(h)
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|e| Error::internal(format!("Could not build HTTP client: {e}")))?;
        Ok(Self { client, max_len: max_content_length })
    }

    pub async fn get(&self, url: &str) -> Result<Fetched> {
        let res = self.client.get(url).send().await.map_err(|e| Error::internal(describe(e)))?;
        let status = res.status();
        if !status.is_success() {
            return Err(Error::internal(format!("Request failed with status code {}", status.as_u16())));
        }
        let ctype = res.headers().get(CONTENT_TYPE).and_then(|v| v.to_str().ok()).map(|s| s.to_lowercase());
        if let Some(c) = &ctype {
            let mime = c.split(';').next().unwrap_or("").trim();
            if mime == "application/pdf" || mime == "application/x-pdf" {
                return Err(Error::internal(format!("Failed to load {url}. This is a pdf!")));
            }
        }
        let charset = ctype.as_deref().and_then(charset_of);
        let final_url = res.url().clone();
        let mut bytes = Vec::new();
        let mut stream = res.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| Error::internal(describe(e)))?;
            if bytes.len() + chunk.len() > self.max_len {
                return Err(Error::internal(format!("maxContentLength size of {} exceeded", self.max_len)));
            }
            bytes.extend_from_slice(&chunk);
        }
        Ok(Fetched { final_url, bytes, charset })
    }
}

fn describe(e: reqwest::Error) -> String {
    if e.is_timeout() {
        "timeout of 20000ms exceeded".into()
    } else if e.is_connect() {
        format!("connect failed: {}", e.without_url())
    } else {
        e.without_url().to_string()
    }
}

fn charset_of(content_type: &str) -> Option<String> {
    let re = regex::Regex::new(r#"charset=\W?([^;\s"']*)"#).ok()?;
    re.captures(content_type).map(|c| c[1].to_lowercase()).filter(|c| !c.is_empty())
}

impl Fetched {
    /// Decodes the body: charset of the header, else BOM / `<meta charset>` / XML prolog, else UTF-8.
    pub fn text(&self) -> String {
        let label = self.charset.clone().or_else(|| sniff_charset(&self.bytes));
        let enc = label
            .and_then(|l| encoding_rs::Encoding::for_label(l.as_bytes()))
            .or_else(|| encoding_rs::Encoding::for_bom(&self.bytes).map(|(e, _)| e))
            .unwrap_or(encoding_rs::UTF_8);
        enc.decode(&self.bytes).0.into_owned()
    }
}

fn sniff_charset(bytes: &[u8]) -> Option<String> {
    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(2048)]).to_lowercase();
    let re = regex::Regex::new(r#"(?:encoding|charset)\s*=\s*["']?\s*([a-z0-9_\-:]+)"#).ok()?;
    re.captures(&head).map(|c| c[1].to_string())
}

#[derive(Debug, Clone)]
pub struct FeedItem {
    pub title: Option<String>,
    pub link: String,
    pub published: Option<DateTime<Utc>>,
    pub image: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ParsedFeed {
    pub title: Option<String>,
    pub link: Option<String>,
    pub description: Option<String>,
    pub items: Vec<FeedItem>,
}

fn resolve(base: &Url, href: &str) -> Option<String> {
    base.join(href.trim()).ok().map(|u| u.to_string())
}

/// Parses an RSS/Atom/RDF/JSON feed. `base` is the (final) feed url, used to resolve relative links.
pub fn parse_feed(text: &str, base: &Url) -> Result<ParsedFeed> {
    // the text is already decoded, so the declared encoding must not be applied a second time
    let re = regex::Regex::new(r#"(?i)(<\?xml[^>]*encoding\s*=\s*["'])[^"']*(["'])"#).map_err(Error::internal)?;
    let text = re.replace(text, "${1}utf-8${2}");
    let feed = feed_rs::parser::parse(text.as_bytes()).map_err(|_| Error::internal("Not a feed"))?;

    let site_link = feed
        .links
        .iter()
        .find(|l| l.rel.as_deref() != Some("self"))
        .map(|l| l.href.as_str());
    let items = feed
        .entries
        .iter()
        .filter_map(|e| {
            let href = e
                .links
                .iter()
                .find(|l| matches!(l.rel.as_deref(), None | Some("alternate")))
                .or_else(|| e.links.first())
                .map(|l| l.href.as_str())?;
            let image = e
                .media
                .iter()
                .flat_map(|m| m.thumbnails.iter().map(|t| t.image.uri.clone()))
                .next()
                .and_then(|u| resolve(base, &u));
            Some(FeedItem {
                title: e.title.as_ref().map(|t| t.content.trim().to_string()).filter(|t| !t.is_empty()),
                link: resolve(base, href)?,
                published: e.published.or(e.updated),
                image,
            })
        })
        .collect();
    Ok(ParsedFeed {
        title: feed.title.map(|t| t.content.trim().to_string()).filter(|t| !t.is_empty()),
        link: site_link.and_then(|l| resolve(base, l)),
        description: feed.description.map(|t| t.content.trim().to_string()).filter(|t| !t.is_empty()),
        items,
    })
}
