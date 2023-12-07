import Parser from "rss-parser";
import axios from "axios";
import { JSDOM } from "jsdom";
import { Feed, PrismaClient } from "@prisma/client";
import { environment } from "../helper/environment";
import { getPrismaClient } from "../prismaClient";

const parser = new Parser();
const prisma = getPrismaClient();

/**
 * Get favicon url from html
 * @param url The url to get the favicon from
 * @returns The favicon url
 */
export async function getFaviconUrl(url: string) {
    // Use only base url
    const urlObj = new URL(url);
    url = urlObj.origin;

    const res = await axios.get(url);
    const html = res.data;
    const dom = new JSDOM(html);
    const favicon = dom.window.document.querySelector("link[rel='icon']")?.getAttribute("href");

    if (!favicon && (favicon?.length || 0) > environment.maxImageUrlLength) {
        return null;
    }

    // Check if favicon is a relative path
    if (favicon?.startsWith("/")) {
        return url + favicon;
    } else {
        return favicon;
    }
}

/**
 * Get image url from html
 * @param url The url to get the image from
 * @returns The image url
 */
async function getImageUrl(url: string) {
    const res = await axios.get(url);
    const html = res.data;
    const dom = new JSDOM(html);
    const image = dom.window.document.querySelector("meta[property='og:image']")?.getAttribute("content");
    console.log((image?.length || 0) > environment.maxImageUrlLength ? undefined : image)
    return (image?.length || 0) > environment.maxImageUrlLength ? undefined : image;
}

/**
 * Parse a feed from a url
 * @param url The url to parse
 * @returns The parsed feed
 */
export async function parseFeed(url: string) {
    const feed = await parser.parseURL(url);
    return feed;
}

/**
 * Parse a feed and add it to the database
 * @param feed The feed to parse and add to db
 */
export async function parseFeedAndAddToDb(feed: Feed) {
    console.log(`Updating Feed ${feed.title}`);

    const parsedFeed = await parseFeed(feed.link);

    // Update feed title and favicon if changed
    if (parsedFeed.title !== feed.title) {
        await prisma.feed.update({
            where: {
                id: feed.id
            },
            data: {
                title: parsedFeed.title
            }
        });
    }

    const favicon = await getFaviconUrl(feed.link);

    if (favicon !== feed.faviconUrl) {
        await prisma.feed.update({
            where: {
                id: feed.id
            },
            data: {
                faviconUrl: favicon
            }
        });
    }

    // Set lastUpdated to now
    await prisma.feed.update({
        where: {
            id: feed.id
        },
        data: {
            lastUpdate: new Date()
        }
    });

    try {
        await addArticlesToDb(parsedFeed, feed.id);
    } catch (err) {
        console.error("\nError while adding articles of feed " + feed.title + " to database: \n" + err);
    }
}

/**
 * Add articles to database
 * @param feed A parsed feed
 * @param feedId The id of the feed
 */
async function addArticlesToDb(feed: Parser.Output<any>, feedId: string) {
    const articles = feed.items;
    let newArticles = 0;

    for (const article of articles) {
        try {
            const existingArticle = await prisma.article.findUnique({
                where: {
                    link: article.link
                }
            });

            if (!existingArticle) {
                const imageUrl = await getImageUrl(article.link);

                let publishedAt: Date | null = new Date(article.pubDate);
                if (isNaN(publishedAt.getTime())) {
                    publishedAt = null;
                }

                await prisma.article.create({
                    data: {
                        title: article.title,
                        link: article.link,
                        imageUrl: imageUrl,
                        feedId: feedId,
                        publishedAt: publishedAt
                    }
                });

                newArticles++;
            }
        } catch (err) {
            console.error("\nError while adding article " + article.title + " to database: \n" + err);
        }
    }

    console.log(`Added ${newArticles} from ${articles.length} Articles`);
}

/**
 * Parse all feeds and add them to the database
 */
async function updateAllFeeds() {
    try {
        // Find all active feeds
        const feeds = await prisma.feed.findMany({
            where: {
                active: true
            }
        });

        console.log(`Updating ${feeds.length} Feeds`);

        for (const feed of feeds) {
            try {
                await parseFeedAndAddToDb(feed);
            } catch (err) {
                console.error("\nFehler beim Parsen von Feed " + feed.title + ": \n" + err);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * Initialize the feed parser
 * @param intervall The intervall in ms to update the feeds
 */
export function initFeedParser(intervall = environment.feedUpdateInterval) {
    console.log("Initializing Feed Parser with an intervall of " + intervall + "ms");
    setInterval(() => {
        try {
            updateAllFeeds()
        } catch (err) {
            console.error(err);
        }
    }, intervall);
}