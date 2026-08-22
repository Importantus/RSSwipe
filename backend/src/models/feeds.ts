import { FeedCreateInputType, FeedUpdateInputType } from "../validators/feeds";
import { getDescription, getFaviconUrl, parseFeed, parseFeedAndAddToDb } from "../jobs/feedparser";
import APIError from "../helper/apiError";
import { getPrismaClient } from "../prismaClient";
import log, { Level, Scope } from "../helper/logger";
import { getDomFromUrl } from "../helper/htmlParsing";
import { buildOpml, parseOpml } from "../helper/opml";
import { environment } from "../helper/environment";
import type { Feed } from "@prisma/client";
import { JSDOM } from "jsdom";


const prisma = getPrismaClient();

// MySQL VARCHAR(191) is the implicit limit for non-annotated string columns
const MAX_TITLE_LENGTH = 191;

// Maximum parallel metadata fetches after an OPML import
const IMPORT_PARSE_CONCURRENCY = 5;


export async function followFeed(userId: string, feedInput: FeedCreateInputType) {
    // Check if feed already exists
    let feed = await getFeedByUrl(feedInput.url);

    if (!feed) {
        try {
            feed = await createFeed(feedInput);
        } catch (err) {
            log(err, Scope.API, Level.ERROR);
            throw APIError.badRequest("Invalid feed url");
        }
    } else {
        // Check if feed is active
        if (!feed.active) {
            await prisma.feed.update({
                where: {
                    id: feed.id
                },
                data: {
                    active: true
                }
            });
        }
    }

    // Check if user already follows feed
    const follow = await prisma.feedList.findUnique({
        where: {
            userId_feedId: {
                userId,
                feedId: feed.id
            }
        }
    });

    if (follow) {
        throw APIError.badRequest("User already follows this feed");
    }

    await prisma.feedList.create({
        data: {
            userId,
            feedId: feed.id
        }
    });

    parseFeedAndAddToDb(feed);

    return feed;
}

export async function unfollowFeed(userId: string, feedId: string) {
    // Check if user follows feed
    const follow = await prisma.feedList.findUnique({
        where: {
            userId_feedId: {
                userId,
                feedId
            }
        }
    });

    if (!follow) {
        throw APIError.badRequest("User does not follow this feed");
    }

    await prisma.feedList.delete({
        where: {
            userId_feedId: {
                userId,
                feedId
            }
        }
    });

    // Check if feed is followed by other users
    const otherFollow = await prisma.feedList.findFirst({
        where: {
            feedId
        }
    });

    if (!otherFollow) {
        // Set feed to inactive
        await prisma.feed.update({
            where: {
                id: feedId
            },
            data: {
                active: false
            }
        });
    }
}

export async function getFollowedFeeds(userId: string) {
    const feeds = await prisma.feedList.findMany({
        where: {
            userId
        },
        select: {
            openInApp: true,
            feed: true
        }
    });
    return feeds.map(feed => {
        return {
            ...feed.feed,
            openInApp: feed.openInApp
        }
    });
}

export async function getFeedInfo(userid: string, feedId: string) {
    const feed = await prisma.feed.findUnique({
        where: {
            id: feedId
        }
    });

    if (!feed) {
        throw APIError.notFound();
    }

    const feedList = await prisma.feedList.findUnique({
        where: {
            userId_feedId: {
                userId: userid,
                feedId: feedId
            }
        }
    });

    if (!feedList) {
        throw APIError.notFound();
    }

    return {
        ...feed,
        openInApp: feedList.openInApp
    };
}

export async function updateFeed(userid: string, feedId: string, input: FeedUpdateInputType) {
    const feedList = await prisma.feedList.findUnique({
        where: {
            userId_feedId: {
                userId: userid,
                feedId: feedId
            }
        }
    });

    if (!feedList) {
        throw APIError.notFound();
    }

    await prisma.feedList.update({
        where: {
            userId_feedId: {
                userId: userid,
                feedId: feedId
            }
        },
        data: {
            openInApp: input.openInApp
        }
    });
}

async function createFeed(feedInput: FeedCreateInputType) {
    const dom: JSDOM = await getDomFromUrl(feedInput.url, {
        correctUrls: true,
    });
    const favicon = await getFaviconUrl(dom);

    let parsedFeed;
    let feedUrlToSave = feedInput.url;

    try {
        parsedFeed = await parseFeed(feedInput.url);
    } catch (e1) {
        try {
            const feedUrl = extractFeedUrl(dom);
            if (!feedUrl) throw new Error("Failed to extract feed url from meta information.")
            feedUrlToSave = feedUrl;
            parsedFeed = await parseFeed(feedUrl)
        } catch (e2) {
            throw e1
        }
    }

    const description = await getDescription(dom, parsedFeed!);
    return await prisma.feed.create({
        data: {
            title: parsedFeed!.meta.title || feedInput.url,
            link: feedUrlToSave,
            faviconUrl: favicon,
            description: description,
        }
    });
}

function extractFeedUrl(dom: JSDOM): string | null {
    return dom.window.document.querySelector('link[rel="alternate"][type="application/rss+xml"]')?.getAttribute("href") || null
}

async function getFeedByUrl(url: string) {
    const feed = await prisma.feed.findUnique({
        where: {
            link: url
        }
    });
    return feed;
}

/**
 * Exports all feeds a user follows as an OPML 2.0 document.
 * @param userId The id of the user
 */
export async function exportFeedsAsOpml(userId: string): Promise<string> {
    const feedLists = await prisma.feedList.findMany({
        where: {
            userId
        },
        include: {
            feed: true
        }
    });

    return buildOpml(feedLists.map(feedList => ({
        title: feedList.feed.title,
        link: feedList.feed.link,
    })));
}

export type ImportResult = {
    imported: number;
    skipped: number;
    failed: { url: string; reason: string }[];
};

/**
 * Imports feeds from an OPML 2.0 document. Feed rows are created without any
 * network access - the metadata is refreshed in the background after the
 * response has been sent.
 * @param userId The id of the user
 * @param xml The OPML document
 */
export async function importFeedsFromOpml(userId: string, xml: string): Promise<ImportResult> {
    let entries;
    try {
        entries = parseOpml(xml);
    } catch (err: any) {
        throw APIError.badRequest(err?.message ?? "Invalid OPML file");
    }

    const result: ImportResult = { imported: 0, skipped: 0, failed: [] };

    if (entries.length === 0) {
        return result;
    }

    const validEntries = entries.filter(entry => {
        if (entry.xmlUrl.length > Number(environment.maxUrlLength)) {
            result.failed.push({ url: entry.xmlUrl, reason: "URL too long" });
            return false;
        }
        return true;
    });

    // Batch check which urls already exist in the database
    const existingFeeds = await prisma.feed.findMany({
        where: {
            link: {
                in: validEntries.map(entry => entry.xmlUrl)
            }
        }
    });
    const feedByLink = new Map(existingFeeds.map(feed => [feed.link, feed]));

    // Batch check which of the existing feeds the user already follows
    const followedFeedIds = new Set(
        (
            await prisma.feedList.findMany({
                where: {
                    userId,
                    feedId: {
                        in: existingFeeds.map(feed => feed.id)
                    }
                },
                select: {
                    feedId: true
                }
            })
        ).map(follow => follow.feedId)
    );

    const createdFeeds: Feed[] = [];

    for (const entry of validEntries) {
        try {
            let feed = feedByLink.get(entry.xmlUrl);

            if (!feed) {
                try {
                    feed = await prisma.feed.create({
                        data: {
                            title: (entry.title || entry.xmlUrl).substring(0, MAX_TITLE_LENGTH),
                            link: entry.xmlUrl,
                        }
                    });
                    createdFeeds.push(feed);
                } catch (err: any) {
                    // The feed was created concurrently e.g. by another import
                    if (err?.code !== "P2002") throw err;
                    const existing = await getFeedByUrl(entry.xmlUrl);
                    if (!existing) throw err;
                    feed = existing;
                }
            }

            if (followedFeedIds.has(feed.id)) {
                result.skipped++;
                continue;
            }

            if (!feed.active) {
                await prisma.feed.update({
                    where: {
                        id: feed.id
                    },
                    data: {
                        active: true
                    }
                });
            }

            try {
                await prisma.feedList.create({
                    data: {
                        userId,
                        feedId: feed.id
                    }
                });
            } catch (err: any) {
                // The user started following this feed concurrently
                if (err?.code !== "P2002") throw err;
                result.skipped++;
                continue;
            }

            result.imported++;
        } catch (err: any) {
            log(`Error while importing feed ${entry.xmlUrl}: ${err}`, Scope.API, Level.ERROR);
            result.failed.push({ url: entry.xmlUrl, reason: err?.message ?? "Unknown error" });
        }
    }

    // Refresh the placeholder titles and fetch missing metadata only after the
    // response has been sent. Errors are logged only - error_count handling
    // happens inside parseFeedAndAddToDb.
    runWithConcurrency(createdFeeds, IMPORT_PARSE_CONCURRENCY, async feed => {
        try {
            await parseFeedAndAddToDb(feed);
        } catch (err) {
            log(`Error while updating metadata of imported feed ${feed.title}: ${err}`, Scope.FEEDPARSER, Level.ERROR);
        }
    });

    return result;
}

/**
 * Runs an async worker over all items with a limited concurrency.
 * @param items The items to process
 * @param limit Maximum number of workers running at the same time
 * @param worker The worker to run for each item
 */
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
    let index = 0;

    const runners = Array.from(
        { length: Math.min(limit, items.length) },
        async () => {
            while (index < items.length) {
                const item = items[index++];
                await worker(item);
            }
        }
    );

    await Promise.all(runners);
}