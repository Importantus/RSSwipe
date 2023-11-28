import Parser from "rss-parser";
import axios from "axios";
import { JSDOM } from "jsdom";

const parser = new Parser();

export async function getFaviconUrl(url: string) {
    // Use only base url
    const urlObj = new URL(url);
    url = urlObj.origin;

    const res = await axios.get(url);
    const html = res.data;
    const dom = new JSDOM(html);
    const favicon = dom.window.document.querySelector("link[rel='icon']")?.getAttribute("href");
    return url + favicon;
}

export async function parseFeed(url: string) {
    const feed = await parser.parseURL(url);
    return feed;
}