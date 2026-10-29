"""Fake publisher serving feeds and article pages for the contract tests.

Dates are generated relative to "now" so articles are never older than the backend's
TIME_TO_DELETE_OLD_ARTICLES. Query string `n` on feed urls controls the number of items.
"""
import time
from email.utils import formatdate
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE = "http://publisher:9000"


def iso(hours_ago):
    return (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")


def rfc822(hours_ago):
    return formatdate(time.time() - hours_ago * 3600, usegmt=True)


def page(title, body, extra_head=""):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{title}</title>{extra_head}</head>
<body><article><h1>{title}</h1>{body}</article></body></html>"""


def article_page(i, slug="article"):
    head = (f'<meta property="og:image" content="/img/{i}.png">'
            f'<meta property="article:published_time" content="{iso(i)}">')
    paragraphs = "".join(f"<p>Paragraph {k} of article {i}. " + "Lorem ipsum dolor sit amet. " * 12 + "</p>" for k in range(6))
    return page(f"Article {i}", paragraphs, head)


def site_home():
    head = ('<meta name="description" content="Fixture site description">'
            '<link rel="icon" href="/favicon.ico">'
            '<link rel="alternate" type="application/rss+xml" href="/feed/rss.xml">')
    return page("Fixture Site", "<p>Welcome</p>", head)


def rss(n):
    items = "".join(f"""<item><title>Item {i}</title><link>{BASE}/article/{i}</link>
<guid>{BASE}/article/{i}</guid><pubDate>{rfc822(i)}</pubDate><description>Summary {i}</description></item>""" for i in range(1, n + 1))
    return f"""<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Fixture RSS</title>
<link>{BASE}/site</link><description>Fixture feed</description>{items}</channel></rss>"""


def atom(n):
    entries = "".join(f"""<entry><title>Atom {i}</title><link href="{BASE}/article/{i}"/><id>{BASE}/article/{i}</id>
<updated>{iso(i)}</updated><published>{iso(i)}</published></entry>""" for i in range(1, n + 1))
    return f"""<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Fixture Atom</title>
<link href="{BASE}/site"/><id>{BASE}/feed/atom.xml</id><updated>{iso(0)}</updated>{entries}</feed>"""


def rdf(n):
    items = "".join(f"""<item rdf:about="{BASE}/article/{i}"><title>RDF {i}</title><link>{BASE}/article/{i}</link>
<dc:date>{iso(i)}</dc:date></item>""" for i in range(1, n + 1))
    return f"""<?xml version="1.0" encoding="UTF-8"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel rdf:about="{BASE}/feed/rdf.xml"><title>Fixture RDF</title>
<link>{BASE}/site</link></channel>{items}</rdf:RDF>"""


def latin1():
    body = f"""<?xml version="1.0" encoding="ISO-8859-1"?><rss version="2.0"><channel><title>Grüße aus Lübeck</title>
<link>{BASE}/site</link><description>Umlaute</description><item><title>Überschrift äöü</title><link>{BASE}/article/1</link>
<pubDate>{rfc822(1)}</pubDate></item></channel></rss>"""
    return body.encode("iso-8859-1")


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="text/html; charset=utf-8", headers=None):
        if isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        n = int(q.get("n", ["3"])[0])
        p = u.path
        if p in ("/site", "/site/"):
            return self.send(200, site_home())
        if p == "/feed/rss.xml":
            return self.send(200, rss(n), "application/rss+xml; charset=utf-8")
        if p == "/feed/atom.xml":
            return self.send(200, atom(n), "application/atom+xml; charset=utf-8")
        if p == "/feed/rdf.xml":
            return self.send(200, rdf(n), "application/rdf+xml")
        if p == "/feed/latin1.xml":
            return self.send(200, latin1(), "application/rss+xml")  # charset only in the xml prolog
        if p == "/feed/broken.xml":
            return self.send(200, "<rss><channel><title>oops", "application/rss+xml")
        if p == "/feed/redirect":
            return self.send(302, "", headers={"Location": "/feed/rss.xml"})
        if p.startswith("/article/"):
            return self.send(200, article_page(int(p.rsplit("/", 1)[1])))
        if p == "/pdf":
            return self.send(200, b"%PDF-1.4 fake", "application/pdf")
        if p == "/big":
            return self.send(200, "x" * 9_000_000, "text/plain")
        if p == "/notfeed":
            return self.send(200, page("Plain page", "<p>no feed here</p>"))
        if p == "/slow":
            time.sleep(25)
            return self.send(200, "late")
        if p == "/favicon.ico":
            return self.send(200, b"\x00", "image/x-icon")
        return self.send(404, page("Not found", "<p>404</p>"))


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 9000), H).serve_forever()
