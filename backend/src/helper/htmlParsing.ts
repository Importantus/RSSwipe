import { JSDOM, VirtualConsole } from "jsdom";
import axios from "axios";
import DOMPurify from "isomorphic-dompurify";

interface Options {
    correctUrls?: boolean
    sanitizeHtml?: boolean
    useVirtualConsole?: boolean
}

const defaultOptions: Options = {
    correctUrls: false,
    sanitizeHtml: true,
    useVirtualConsole: true
}

function getOptions(options: Options) {
    return { ...defaultOptions, ...options };
}

/**
 * Get jsdom-object from url
 * @param url The url to get the dom from
 * @returns The jsdom-object
 */
export async function getDomFromUrl(url: string, options: Options = defaultOptions): Promise<JSDOM> {
    options = getOptions(options);

    const res = await axios.get(url);
    let dom: JSDOM;
    let baseUrl = getBaseUrl(url);
    let correctUrls = options.correctUrls;

    if (options.sanitizeHtml) {
        res.data = sanitizeHtml(res.data);
    }

    if (options.useVirtualConsole) {
        const virtualConsole = new VirtualConsole();
        dom = new JSDOM(res.data, { virtualConsole });
    } else {
        dom = new JSDOM(res.data);
    }

    if (correctUrls) {
        correctUrlsInDom(dom, baseUrl);
    }

    return dom;
}

/**
 * Sanitize html
 * @param html The html to sanitize
 * @returns The sanitized html
 */
function sanitizeHtml(html: string) {
    // Sanitize html because of weird jsdom bug (https://github.com/jsdom/jsdom/issues/2177)
    html = DOMPurify.sanitize(html, {
        ADD_ATTR: ['content', 'property', 'itemprop', 'datetime'],
        ADD_TAGS: ['meta', 'head', 'link', 'time'],
        ADD_URI_SAFE_ATTR: ['property'],
        // Remove source tags because they are altered wrongly by Readability
        FORBID_TAGS: ['style', 'source'],
        ALLOW_DATA_ATTR: true,
        ALLOW_ARIA_ATTR: true,
        WHOLE_DOCUMENT: true,
    });
    return html;
}

function correctUrlsInDom(dom: JSDOM, baseUrl: string) {
    const sourceElements = dom.window.document.querySelectorAll("[src], [href], [content], [srcset]");
    for (const element of sourceElements) {
        if (element.hasAttribute("src")) {
            const src = element.getAttribute("src")!;
            element.setAttribute("src", correctUrl(src, baseUrl));
        }
        if (element.hasAttribute("href")) {
            const href = element.getAttribute("href")!;
            element.setAttribute("href", correctUrl(href, baseUrl));
        }
        if (element.hasAttribute("content")) {
            const content = element.getAttribute("content")!;
            element.setAttribute("content", correctUrl(content, baseUrl));
        }
        if (element.hasAttribute("srcset")) {
            const srcset = element.getAttribute("srcset")!;
            const srcsetCorrected = srcset.split(",").map((src) => {
                const srcCorrected = src.trim().split(" ");
                return correctUrl(srcCorrected[0], baseUrl) + " " + srcCorrected[1];
            }).join(", ");
            element.setAttribute("srcset", srcsetCorrected);
        }
    }
}

function getBaseUrl(url: string) {
    const urlObj = new URL(url);
    return urlObj.origin;
}

function correctUrl(url: string, baseUrl: string) {
    if (url.startsWith("//")) {
        return "https:" + url;
    }
    if (url.startsWith("/")) {
        return baseUrl + url;
    }
    return url;
}