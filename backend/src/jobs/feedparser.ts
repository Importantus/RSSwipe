import type { JSDOM } from "jsdom";
import { Feed } from "@prisma/client";
import { environment } from "../helper/environment";
import { getPrismaClient } from "../prismaClient";
import { categorizeArticles } from "./categorizer";
import { getDomFromUrl } from "../helper/htmlParsing";
import { ParsedFeed, parseFeedFromUrl } from "../helper/feedParsing";
import FeedParser from "feedparser";
import log, { Level, Scope } from "../helper/logger";

const prisma = getPrismaClient();

/**
 * Get favicon url from html
 * @param dom The dom to get the favicon from
 * @returns The favicon url
 */
export async function getFaviconUrl(dom: JSDOM) {
    const queries = [
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
        'link[rel="shortcut icon"]',
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
            log("Error while parsing favicon: " + err, Scope.FEEDPARSER, Level.ERROR);
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
            log("Error while parsing date: " + err, Scope.FEEDPARSER, Level.ERROR);
            break;
        }
    }

    return publishedAt;
}

export async function getDescription(dom: JSDOM, feed: ParsedFeed): Promise<string | null> {
    const queries = [
        {
            query: "meta[name='description']",
            attribute: "content"
        },
        {
            query: "meta[property='og:description']",
            attribute: "content"
        },
        {
            query: "meta[name='twitter:description']",
            attribute: "content"
        }
    ]

    let description: string | null = null;

    for (const query of queries) {
        try {
            if (description != null) {
                break;
            }
            description = dom.window.document.querySelector(query.query)?.getAttribute(query.attribute) || null;
        } catch (err) {
            log("Error while parsing description: " + err, Scope.FEEDPARSER, Level.ERROR);
            break;
        }
    }

    const appendedDescription = description?.trim() === feed.meta.description?.trim() ? null : `${description ?? ""}${description ? " - " : ""}${feed.meta.description ?? ""}`;

    return appendedDescription || description;
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
    log(`Updating Feed ${feed.title}`, Scope.FEEDPARSER);

    try {
        const parsedFeed: ParsedFeed = await parseFeed(feed.link);

        let link = parsedFeed.meta.link;
        if (!link) {
            // Use only base url
            const urlObj = new URL(feed.link);
            link = urlObj.origin;
        }
        const dom: JSDOM = await getDomFromUrl(link, {
            correctUrls: true,
        });

        // Update feed title if changed
        if (parsedFeed.meta.title !== feed.title) {
            log(`Updating title of feed ${feed.title} to ${parsedFeed.meta.title}`, Scope.FEEDPARSER);
            await prisma.feed.update({
                where: {
                    id: feed.id
                },
                data: {
                    title: parsedFeed.meta.title
                }
            });
        }

        // Update feed description if changed
        const newDescription = await getDescription(dom as JSDOM, parsedFeed);
        if (feed.description !== newDescription) {
            log(`Updating description of feed ${feed.title} to ${newDescription}`, Scope.FEEDPARSER);
            await prisma.feed.update({
                where: {
                    id: feed.id
                },
                data: {
                    description: newDescription
                }
            });
        }

        // Get Favicon
        let favicon = await getFaviconUrl(dom);
        if (!favicon) {
            favicon = feed.faviconUrl;
        }

        // Update favicon if changed
        if (favicon !== feed.faviconUrl) {
            log(`Updating favicon of feed ${feed.title} to ${favicon}`, Scope.FEEDPARSER);
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
            log("\nError while adding articles of feed " + feed.title + " to database: \n" + err, Scope.FEEDPARSER, Level.ERROR);
            throw err;
        }

        // Reset error count
        await prisma.feed.update({
            where: {
                id: feed.id
            },
            data: {
                error_count: 0,
                errormessage: null
            }
        });
    } catch (err: any) {
        log("\nError while parsing feed " + feed.title + ": \n" + err, Scope.FEEDPARSER, Level.ERROR);


        const errorMessage = err?.message ? err?.message : "Unknown error while parsing feed";
        await prisma.feed.update({
            where: {
                id: feed.id
            },
            data: {
                errormessage: errorMessage.length > 255 ? errorMessage.substring(0, 255) : errorMessage,
                error_count: {
                    increment: 1
                }
            }
        });

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
        const existingArticle = await prisma.article.findFirst({
            where: {
                link: article.link,
                feedId: feedId
            }
        });

        if (!existingArticle) {
            let dom: JSDOM | null = null;
            const getDom = async () => {
                if (!dom) {
                    dom = await getDomFromUrl(article.link, {
                        correctUrls: true,
                    });
                }
                return dom;
            }

            let publishedAt: Date | null = null;

            if (!article.pubdate && !article.date) {
                publishedAt = getPublishedAt(await getDom());
            } else {
                publishedAt = new Date(article.pubdate ? article.pubdate : article.date!);
            }

            // Skip articles that are older than maxArticleAge
            if (publishedAt && publishedAt.getTime() < (new Date().getTime() - Number(environment.maxArticleAge))) {
                continue;
            }

            const imageUrl = getImageUrl(await getDom());

            await prisma.article.create({
                data: {
                    title: article.title ? article.title : "No title set",
                    link: article.link,
                    imageUrl: imageUrl ? imageUrl : article.image?.url,
                    feedId: feedId,
                    publishedAt: publishedAt
                }
            });

            newArticles++;
        }
    }

    log(`Added ${newArticles} from ${articles.length} Articles`, Scope.FEEDPARSER);
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

        log(`
        
Updating ${feeds.length} Feeds
        
        `, Scope.FEEDPARSER);

        for (const feed of feeds) {
            try {
                if (feed.error_count > Number(environment.maxFeedErrorCount)) {
                    log(`Skipping feed ${feed.title} because it has too many errors (${feed.error_count})`, Scope.FEEDPARSER, Level.WARN);
                    continue;
                }
                await parseFeedAndAddToDb(feed);
                log("Updated Feed " + feed.title, Scope.FEEDPARSER);
            } catch (err) {
                // Should never happen, as parseFeedAndAddToDb catches all errors
                log("\nFehler beim Parsen von Feed " + feed.title + ": \n" + err, Scope.FEEDPARSER, Level.ERROR);
            }
        }

        if (environment.enableFeedClassification === "true") {
            categorizeArticles();
        }
    } catch (err) {
        log(err as string, Scope.FEEDPARSER, Level.ERROR);
    }
}

/**
 * Initialize the feed parser
 * @param intervall The intervall in ms to update the feeds
 */
export async function initFeedParser(intervall = Number(environment.feedUpdateInterval)) {
    try {
        log("Initializing Feed Parser with an intervall of " + intervall + "ms", Scope.FEEDPARSER);
        let time = new Date().getTime();
        while (true) {
            try {
                await updateAllFeeds();
            } catch (error) {
                log("Error while updating feeds: " + error, Scope.FEEDPARSER, Level.ERROR);
            }

            // Wait until intervall is over
            await new Promise((resolve) => setTimeout(resolve, intervall - (new Date().getTime() - time)));
            time = new Date().getTime();
        }
    } catch (error) {
        log("Error while parsing feeds: " + error, Scope.FEEDPARSER, Level.ERROR);
        log("Feed parsing job failed. Attempting to restart...", Scope.FEEDPARSER);
        initFeedParser(intervall);
    }
}