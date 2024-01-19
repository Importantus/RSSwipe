import axios from "../axios";
import FeedParser from "feedparser";

export type ParsedFeed = {
    meta: FeedParser.Meta,
    items: FeedParser.Item[]
}

export function parseFeedFromUrl(feedUrl: string): Promise<ParsedFeed> {
    return new Promise((resolve, reject) => {
        axios.get(feedUrl, {
            responseType: 'stream'
        })
            .then((res) => {
                const responseStream = res.data;
                const feedparser = new FeedParser({});
                const items: FeedParser.Item[] = [];

                if (res.status != 200) {
                    return reject(new Error('Bad status code'));
                }

                responseStream.pipe(feedparser);

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
            })
            .catch(reject);
    });
}