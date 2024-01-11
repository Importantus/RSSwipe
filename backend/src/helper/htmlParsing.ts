import { JSDOM, VirtualConsole } from "jsdom";
import axios from "axios";
import DOMPurify from "isomorphic-dompurify";

/**
 * Get jsdom-object from url
 * @param url The url to get the dom from
 * @returns The jsdom-object
 */
export async function getDomFromUrl(url: string): Promise<JSDOM> {
    const res = await axios.get(url);
    const html = sanitizeHtml(res.data);
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html, { virtualConsole });
    return dom;
}

/**
 * Sanitize html
 * @param html The html to sanitize
 * @returns The sanitized html
 */
function sanitizeHtml(html: string) {
    // Sanitize html because of weird jsdom bug (https://github.com/jsdom/jsdom/issues/2177)
    html = DOMPurify.sanitize(html, { FORBID_TAGS: ['style'] });
    return html;
}