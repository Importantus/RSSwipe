//! OPML 2.0 export and import.
use crate::{Error, Result};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::collections::HashSet;
use url::Url;

#[derive(Debug, Clone, PartialEq)]
pub struct OpmlFeed {
    pub title: Option<String>,
    pub xml_url: String,
}

fn escape(v: &str) -> String {
    v.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

pub fn build(feeds: &[(String, String)]) -> String {
    let mut out = vec![
        r#"<?xml version="1.0" encoding="UTF-8"?>"#.to_string(),
        r#"<opml version="2.0">"#.to_string(),
        "\t<head>".to_string(),
        "\t\t<title>Subscriptions</title>".to_string(),
        format!(
            "\t\t<dateCreated>{}</dateCreated>",
            chrono::Utc::now().format("%a, %d %b %Y %H:%M:%S GMT")
        ),
        "\t</head>".to_string(),
        "\t<body>".to_string(),
    ];
    for (title, link) in feeds {
        let t = escape(if title.is_empty() { link } else { title });
        out.push(format!(
            "\t\t<outline text=\"{t}\" title=\"{t}\" type=\"rss\" xmlUrl=\"{}\" />",
            escape(link)
        ));
    }
    out.extend([
        "\t</body>".to_string(),
        "</opml>".to_string(),
        String::new(),
    ]);
    out.join("\n")
}

/// Removes a trailing slash from the path (except for the root) and rejects non-http(s) urls.
fn normalize_url(url: &str) -> Option<String> {
    let u = Url::parse(url.trim()).ok()?;
    if u.scheme() != "http" && u.scheme() != "https" {
        return None;
    }
    let path = u.path();
    let path = if path.len() > 1 && path.ends_with('/') {
        &path[..path.len() - 1]
    } else {
        path
    };
    let mut s = format!("{}://{}", u.scheme(), u.host_str()?);
    if let Some(p) = u.port() {
        s.push_str(&format!(":{p}"));
    }
    s.push_str(path);
    if let Some(q) = u.query() {
        s.push_str(&format!("?{q}"));
    }
    if let Some(f) = u.fragment() {
        s.push_str(&format!("#{f}"));
    }
    Some(s)
}

/// Collects all outlines carrying an `xmlUrl`, flattening folders; normalizes and de-duplicates the urls.
pub fn parse(xml: &str) -> Result<Vec<OpmlFeed>> {
    let mut reader = Reader::from_str(xml);
    let mut saw_opml = false;
    let mut in_body = false;
    let mut found: Vec<OpmlFeed> = Vec::new();
    loop {
        match reader.read_event() {
            Ok(Event::Eof) => break,
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let name = e.name();
                let name = String::from_utf8_lossy(name.as_ref()).to_string();
                if name == "opml" {
                    saw_opml = true;
                } else if name == "body" && saw_opml {
                    in_body = true;
                } else if name == "outline" && in_body {
                    let (mut xml_url, mut title, mut text) = (None, None, None);
                    for a in e.attributes().flatten() {
                        let v = a
                            .unescape_value()
                            .map(|v| v.to_string())
                            .unwrap_or_default();
                        match a.key.as_ref() {
                            b"xmlUrl" => xml_url = Some(v),
                            b"title" => title = Some(v),
                            b"text" => text = Some(v),
                            _ => {}
                        }
                    }
                    if let Some(u) = xml_url.filter(|u| !u.trim().is_empty()) {
                        let t = title
                            .filter(|t| !t.trim().is_empty())
                            .or(text)
                            .filter(|t| !t.trim().is_empty());
                        found.push(OpmlFeed {
                            title: t,
                            xml_url: u,
                        });
                    }
                }
            }
            Ok(_) => {}
            Err(e) => return Err(Error::bad_request(format!("Could not parse OPML: {e}"))),
        }
    }
    if !saw_opml {
        return Err(Error::bad_request("Missing <opml> root element"));
    }
    let mut seen = HashSet::new();
    Ok(found
        .into_iter()
        .filter_map(|f| {
            normalize_url(&f.xml_url).map(|u| OpmlFeed {
                title: f.title,
                xml_url: u,
            })
        })
        .filter(|f| seen.insert(f.xml_url.clone()))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_folders_normalizes_and_dedupes() {
        let xml = r#"<opml version="2.0"><body><outline text="F"><outline text="A" xmlUrl="http://a/x/"/></outline>
            <outline title="B" text="b" xmlUrl="ftp://b"/><outline text="dup" xmlUrl="http://a/x"/></body></opml>"#;
        let f = parse(xml).unwrap();
        assert_eq!(
            f,
            vec![OpmlFeed {
                title: Some("A".into()),
                xml_url: "http://a/x".into()
            }]
        );
    }

    #[test]
    fn rejects_non_opml() {
        assert!(parse("<a></a>").is_err());
    }

    #[test]
    fn export_escapes() {
        let x = build(&[("A <b> & \"q\"".into(), "http://h/?a=1&b=2".into())]);
        assert!(x.contains("text=\"A &lt;b&gt; &amp; &quot;q&quot;\""));
        assert!(x.contains("xmlUrl=\"http://h/?a=1&amp;b=2\""));
    }
}
