import type { JSDOM } from "jsdom";
import { Feed } from "@prisma/client";
import { environment } from "../helper/environment";
import { getPrismaClient } from "../prismaClient";
import { categorizeArticles } from "./categorizer";
import { getDomFromUrl } from "../helper/htmlParsing";
import { parseFeedFromUrl } from "../helper/feedParsing";
import FeedParser from "feedparser";

const prisma = getPrismaClient();

/**
 * Get favicon url from html
 * @param url The url to get the favicon from
 * @returns The favicon url
 */
export async function getFaviconUrl(url: string) {
    const dom = await getDomFromUrl(url, {
        correctUrls: true,
    });

    const queries = [
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
        'link[rel="shortcut icon"]',
        'link[rel="icon", type="image/png"]',
        'link[rel="icon"]',
    ]

    let favicon: string | null | undefined = null;

    for (const query of queries) {
        try {
            favicon = dom.window.document.querySelector(query)?.getAttribute("href");
            if (favicon) {
                break;
            }
        } catch (err) {
            console.error("Error while parsing favicon: " + err);
            break;
        }
    }

    if (!favicon && (favicon?.length || 0) > Number(environment.maxImageUrlLength)) {
        return null;
    }

    return favicon;
}

/**
 * Get image url from dom
 * @param dom The dom to get the image from
 * @returns The image url
 */
function getImageUrl(dom: JSDOM) {
    const image = dom.window.document.querySelector("meta[property='og:image']")?.getAttribute("content");
    return (image?.length || 0) > Number(environment.maxImageUrlLength) ? undefined : image;
}

function getPublishedAt(dom: JSDOM) {
    const queries = [
        {
            query: "time[itemprop='datePublished']",
            attribute: "datetime"
        },
        {
            query: "meta[property='article:published_time']",
            attribute: "content"
        },
        {
            query: "meta[property='og:article:published_time']",
            attribute: "content"
        },
        {
            query: "meta[property='og:published_time']",
            attribute: "content"
        },
        {
            query: "meta[property='og:release_date']",
            attribute: "content"
        },
        {
            query: "meta[property='article:release_date']",
            attribute: "content"
        },
        {
            query: "meta[property='article:published']",
            attribute: "content"
        }
    ]

    let publishedAt: Date | null = null;

    for (const query of queries) {
        try {
            const date = dom.window.document.querySelector(query.query)?.getAttribute(query.attribute);
            if (date && !isNaN(new Date(date).getTime())) {
                publishedAt = new Date(date);
                break;
            }
        } catch (err) {
            console.error("Error while parsing date: " + err);
            break;
        }
    }

    return publishedAt;
}

/**
 * Parse a feed from a url
 * @param url The url to parse
 * @returns The parsed feed
 */
export async function parseFeed(url: string) {
    const feed = await parseFeedFromUrl(url);
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
    if (parsedFeed.meta.title !== feed.title) {
        await prisma.feed.update({
            where: {
                id: feed.id
            },
            data: {
                title: parsedFeed.meta.title
            }
        });
    }

    // Get Favicon
    let link = parsedFeed.meta.link;
    if (!link) {
        // Use only base url
        const urlObj = new URL(feed.link);
        link = urlObj.origin;
    }
    let favicon = await getFaviconUrl(link)
    if (!favicon) {
        favicon = feed.faviconUrl;
    }

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
        await addArticlesToDb(parsedFeed.items, feed.id);
    } catch (err) {
        console.error("\nError while adding articles of feed " + feed.title + " to database: \n" + err);
    }
}

/**
 * Add articles to database
 * @param feed A parsed feed
 * @param feedId The id of the feed
 */
async function addArticlesToDb(articles: FeedParser.Item[], feedId: string) {
    let newArticles = 0;

    for (const article of articles) {
        try {
            const existingArticle = await prisma.article.findFirst({
                where: {
                    link: article.link,
                    feedId: feedId
                }
            });

            if (!existingArticle) {
                const dom = await getDomFromUrl(article.link);

                let publishedAt: Date | null = null;

                if (!article.pubdate && !article.date) {
                    publishedAt = getPublishedAt(dom);
                } else {
                    publishedAt = new Date(article.pubdate ? article.pubdate : article.date!);
                }

                if (publishedAt && publishedAt.getTime() < (new Date().getTime() - Number(environment.maxArticleAge))) {
                    console.log("Skipping article " + article.title + " because it is too old: " + publishedAt)
                    continue;
                }

                const imageUrl = getImageUrl(dom);

                await prisma.article.create({
                    data: {
                        title: article.title,
                        link: article.link,
                        imageUrl: imageUrl ? imageUrl : article.image?.url,
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

        categorizeArticles();
    } catch (err) {
        console.error(err);
    }
}

/**
 * Initialize the feed parser
 * @param intervall The intervall in ms to update the feeds
 */
export function initFeedParser(intervall = Number(environment.feedUpdateInterval)) {
    console.log("Initializing Feed Parser with an intervall of " + intervall + "ms");
    setInterval(() => {
        try {
            updateAllFeeds()
        } catch (err) {
            console.error(err);
        }
    }, intervall);
}