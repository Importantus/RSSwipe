//! HTML helpers: metadata extraction (favicon, image, date, description, feed discovery) and Readability.
use crate::{Error, Result};
use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeZone, Utc};
use scraper::{Html, Selector};
use url::Url;

/// What the feed parser/creator needs from an HTML page. Extracted in one go because `scraper::Html` is not `Send`.
#[derive(Debug, Default, Clone)]
pub struct PageMeta {
    pub favicon: Option<String>,
    pub image: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub description: Option<String>,
    pub feed_link: Option<String>,
}

fn first_attr(doc: &Html, queries: &[(&str, &str)]) -> Option<String> {
    queries.iter().find_map(|(q, attr)| {
        let sel = Selector::parse(q).ok()?;
        doc.select(&sel).next()?.value().attr(attr).filter(|v| !v.is_empty()).map(str::to_string)
    })
}

/// Parses the dates that appear in `<meta>`/`<time>` tags; lenient like `Date.parse`.
pub fn parse_date(s: &str) -> Option<DateTime<Utc>> {
    let s = s.trim();
    if let Ok(d) = DateTime::parse_from_rfc3339(s) {
        return Some(d.with_timezone(&Utc));
    }
    if let Ok(d) = DateTime::parse_from_rfc2822(s) {
        return Some(d.with_timezone(&Utc));
    }
    for f in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S%.f", "%Y-%m-%d %H:%M"] {
        if let Ok(d) = NaiveDateTime::parse_from_str(s, f) {
            return Some(Utc.from_utc_datetime(&d));
        }
    }
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok().and_then(|d| d.and_hms_opt(0, 0, 0)).map(|d| Utc.from_utc_datetime(&d))
}

impl PageMeta {
    pub fn from_html(html: &str, page_url: &str, max_url_len: usize) -> Self {
        let doc = Html::parse_document(html);
        let base = Url::parse(page_url).ok();
        let abs = |v: String| -> Option<String> {
            let r = match &base {
                Some(b) => b.join(v.trim()).ok().map(|u| u.to_string()).unwrap_or(v),
                None => v,
            };
            (r.chars().count() <= max_url_len).then_some(r)
        };
        let favicon = first_attr(
            &doc,
            &[
                (r#"link[rel="apple-touch-icon"]"#, "href"),
                (r#"link[rel="apple-touch-icon-precomposed"]"#, "href"),
                (r#"link[rel="shortcut icon"]"#, "href"),
                (r#"link[rel="icon"]"#, "href"),
            ],
        )
        .and_then(abs);
        let image = first_attr(&doc, &[("meta[property='og:image']", "content")]).and_then(abs);
        let published_at = first_attr(
            &doc,
            &[
                ("time[itemprop='datePublished']", "datetime"),
                ("meta[property='article:published_time']", "content"),
                ("meta[property='og:article:published_time']", "content"),
                ("meta[property='og:published_time']", "content"),
                ("meta[property='og:release_date']", "content"),
                ("meta[property='article:release_date']", "content"),
                ("meta[property='article:published']", "content"),
            ],
        )
        .and_then(|d| parse_date(&d));
        let description = first_attr(
            &doc,
            &[
                ("meta[name='description']", "content"),
                ("meta[property='og:description']", "content"),
                ("meta[name='twitter:description']", "content"),
            ],
        );
        let feed_link = first_attr(
            &doc,
            &[
                (r#"link[rel="alternate"][type="application/rss+xml"]"#, "href"),
                (r#"link[rel="alternate"][type="application/atom+xml"]"#, "href"),
            ],
        )
        .and_then(|v| base.as_ref().and_then(|b| b.join(v.trim()).ok()).map(|u| u.to_string()));
        Self { favicon, image, published_at, description, feed_link }
    }
}

/// Combines the page's description with the one from the feed, as the old backend did (without a dangling separator).
pub fn merge_description(page: Option<&str>, feed: Option<&str>) -> Option<String> {
    let (p, f) = (page.map(str::trim).filter(|s| !s.is_empty()), feed.map(str::trim).filter(|s| !s.is_empty()));
    if p == f {
        return page.map(str::to_string).filter(|s| !s.trim().is_empty());
    }
    let parts: Vec<&str> = [page, feed].into_iter().flatten().filter(|s| !s.trim().is_empty()).collect();
    if parts.is_empty() { None } else { Some(parts.join(" - ")) }
}

#[derive(Debug, Clone)]
pub struct Extracted {
    pub title: String,
    pub content: String,
    pub text_content: String,
    pub excerpt: Option<String>,
    pub byline: Option<String>,
    pub dir: Option<String>,
    pub site_name: Option<String>,
    pub lang: Option<String>,
    pub length: i32,
}

fn sanitizer() -> ammonia::Builder<'static> {
    let mut b = ammonia::Builder::default();
    b.add_generic_attributes(["class", "id", "dir"])
        .add_tags(["picture", "source"])
        .add_tag_attributes("img", ["srcset", "sizes", "width", "height"])
        .add_tag_attributes("source", ["srcset", "sizes", "media", "type"])
        .link_rel(None);
    b
}

/// Runs Readability on the page and sanitizes the resulting HTML. CPU bound: call from `spawn_blocking`.
pub fn extract_readable(html: &str, page_url: &str) -> Result<Extracted> {
    let mut r = dom_smoothie::Readability::new(html.to_string(), Some(page_url), None).map_err(|e| Error::internal(e.to_string()))?;
    let a = r.parse().map_err(|_| Error::internal("Parsing failed"))?;
    Ok(Extracted {
        title: a.title,
        content: sanitizer().clean(&a.content).to_string(),
        text_content: a.text_content.to_string(),
        excerpt: a.excerpt,
        byline: a.byline,
        dir: a.dir,
        site_name: a.site_name,
        lang: a.lang,
        length: a.length as i32,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn description_merging() {
        assert_eq!(merge_description(Some("a"), Some("b")).as_deref(), Some("a - b"));
        assert_eq!(merge_description(Some("a"), None).as_deref(), Some("a"));
        assert_eq!(merge_description(None, Some("b")).as_deref(), Some("b"));
        assert_eq!(merge_description(Some(" a "), Some("a")).as_deref(), Some(" a "));
        assert_eq!(merge_description(None, None), None);
    }

    #[test]
    fn meta_is_resolved_against_page_url() {
        let m = PageMeta::from_html(
            r#"<head><link rel="icon" href="/f.ico"><meta property="og:image" content="//cdn/x.png">
            <link rel="alternate" type="application/rss+xml" href="rss.xml"></head>"#,
            "http://h/dir/page",
            1000,
        );
        assert_eq!(m.favicon.as_deref(), Some("http://h/f.ico"));
        assert_eq!(m.image.as_deref(), Some("http://cdn/x.png"));
        assert_eq!(m.feed_link.as_deref(), Some("http://h/dir/rss.xml"));
    }
}
