import { PrismaClient } from "@prisma/client";
import { FeedCreateInputType, FeedUpdateInputType } from "../validators/feeds";
import { getFaviconUrl, parseFeed, parseFeedAndAddToDb } from "../jobs/feedparser";
import APIError from "../helper/apiError";
import { getPrismaClient } from "../prismaClient";
import log, { Level, Scope } from "../helper/logger";

const prisma = getPrismaClient();


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
    const parsedFeed = await parseFeed(feedInput.url);
    const description = await getDescription(dom, parsedFeed);
    return await prisma.feed.create({
        data: {
            title: parsedFeed.meta.title || feedInput.url,
            link: feedInput.url,
            faviconUrl: favicon,
            description: description,
        }
    });
}

async function getFeedByUrl(url: string) {
    const feed = await prisma.feed.findUnique({
        where: {
            link: url
        }
    });
    return feed;
}