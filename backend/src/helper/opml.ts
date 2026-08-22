import { XMLParser } from "fast-xml-parser";

export interface OpmlFeed {
    title: string | null;
    xmlUrl: string;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function buildOpml(feeds: { title: string; link: string; siteUrl?: string | null }[]): string {
    const outlines = feeds.map(feed => {
        const title = escapeXml(feed.title || feed.link);
        let outline = `\t\t<outline text="${title}" title="${title}" type="rss" xmlUrl="${escapeXml(feed.link)}"`;
        if (feed.siteUrl) {
            outline += ` htmlUrl="${escapeXml(feed.siteUrl)}"`;
        }
        return outline + " />";
    });

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<opml version="2.0">',
        "\t<head>",
        `\t\t<title>Subscriptions</title>`,
        `\t\t<dateCreated>${new Date().toUTCString()}</dateCreated>`,
        "\t</head>",
        "\t<body>",
        ...outlines,
        "\t</body>",
        "</opml>",
        ""
    ].join("\n");
}

/**
 * Normalizes a feed url for deduplication. Returns null for invalid or unsupported urls.
 * @param url The url to normalize
 */
function normalizeUrl(url: string): string | null {
    try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }

        // Remove trailing slash, except for the root path
        const pathname = parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
            ? parsed.pathname.slice(0, -1)
            : parsed.pathname;

        return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
}

/**
 * Collects all outlines containing a feed url, flattening nested folder outlines.
 * @param outlines The outlines to walk
 * @param result The result array to push feeds into
 */
function collectFeeds(outlines: any[], result: { title: string | null; xmlUrl: string }[]) {
    for (const outline of outlines) {
        if (!outline || typeof outline !== "object") continue;

        if (typeof outline["@_xmlUrl"] === "string" && outline["@_xmlUrl"].trim() !== "") {
            const rawTitle = typeof outline["@_title"] === "string" && outline["@_title"].trim() !== ""
                ? outline["@_title"]
                : outline["@_text"];
            result.push({
                title: typeof rawTitle === "string" && rawTitle.trim() !== "" ? rawTitle : null,
                xmlUrl: outline["@_xmlUrl"],
            });
            continue;
        }

        // Outlines without an xmlUrl are folders - flatten their children.
        // Unknown attributes (e.g. miniflux:*) are ignored implicitly.
        if (Array.isArray(outline.outline)) {
            collectFeeds(outline.outline, result);
        }
    }
}

/**
 * Parses an OPML 2.0 document and returns all contained feeds with normalized urls.
 * @param xml The OPML document as string
 * @throws If the document is not parseable XML or has no <opml> root element
 */
export function parseOpml(xml: string): OpmlFeed[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        isArray: (name) => name === "outline",
    });

    let parsed: any;
    try {
        parsed = parser.parse(xml);
    } catch (err: any) {
        throw new Error(`Could not parse OPML: ${err?.message ?? err}`);
    }

    if (!parsed || typeof parsed !== "object" || !parsed.opml || typeof parsed.opml !== "object") {
        throw new Error("Missing <opml> root element");
    }

    const collected: OpmlFeed[] = [];
    const body = parsed.opml.body;
    if (body && Array.isArray(body.outline)) {
        collectFeeds(body.outline, collected);
    }

    // Normalize urls and deduplicate within the file
    const seen = new Set<string>();
    const feeds: OpmlFeed[] = [];
    for (const entry of collected) {
        const url = normalizeUrl(entry.xmlUrl);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        feeds.push({ title: entry.title, xmlUrl: url });
    }

    return feeds;
}
