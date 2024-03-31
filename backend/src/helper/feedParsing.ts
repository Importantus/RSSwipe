import axios from "../axios";
import FeedParser from "feedparser";
import iconv from "iconv";
import log, { Scope } from "./logger";

export type ParsedFeed = {
    meta: FeedParser.Meta,
    items: FeedParser.Item[]
}

export function parseFeedFromUrl(feedUrl: string): Promise<ParsedFeed> {
    return new Promise((resolve, reject) => {
        axios.get(feedUrl, {
            responseType: 'stream'
        })
            .then(async (res) => {
                const responseStream = res.data;

                if (res.status < 200 || res.status >= 300) {
                    return reject(new Error('Bad status code: ' + res.status));
                }

                // Setup conversion from charset to utf-8
                const charset = res.headers["content-type"]?.toLowerCase().match(/charset=([^;]*)/)?.[1] || await extractCharsetFromRSS(feedUrl);

                const needsConversion = charset && charset !== "utf-8";

                if (needsConversion) log(`Needs conversion from ${charset}`, Scope.FEEDPARSER);

                const converter = new iconv.Iconv(charset, 'utf-8');

                converter.on('error', (err: any) => reject(err));


                // Setup feedparser
                const feedparser = new FeedParser({});
                const items: FeedParser.Item[] = [];

                feedparser.on('error', (err: any) => reject(err));
                feedparser.on('end', () => resolve({
                    meta: feedparser.meta as FeedParser.Meta,
                    items
                }));

                feedparser.on('readable', () => {
                    let post;
                    while (post = feedparser.read()) {
                        items.push(post);
                    }
                });


                // Pipe the response stream through the converter and feedparser
                (needsConversion ? responseStream.pipe(converter) : responseStream).pipe(feedparser);
            })
            .catch(reject);
    });
}

async function extractCharsetFromRSS(feedUrl: string): Promise<string> {
    const res = await axios.get(feedUrl);

    const charset = res.data.toString().match(/encoding\s*=\s*["']([^"']*)["']/);

    return charset && charset[1] ? charset[1].toLowerCase() : "utf-8";
}