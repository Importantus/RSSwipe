import { PrismaClient } from "@prisma/client";
import { environment } from "../helper/environment";
import { getPrismaClient } from "../prismaClient";

const prisma = getPrismaClient();

export function initGarbageCollector(intervall = Number(environment.garbageCollectorInterval)) {
    console.log("Initialising garbage collector with interval of " + intervall + "ms");
    setInterval(async () => {
        try {
            await deleteOldArticles();
            await deleteExpiredArticlesFromReadingList();
            await deleteUnusedFeeds();
        } catch (err) {
            console.error(err);
        }
    }, intervall);
}

async function deleteUnusedFeeds() {
    try {
        let deletedFeeds = 0;

        const feeds = await prisma.feed.findMany();

        for (const feed of feeds) {
            if (!await isFeedUsed(feed.id)) {
                await prisma.feed.delete({
                    where: {
                        id: feed.id
                    }
                });
                deletedFeeds++;
            }
        }

        console.log(`Deleted ${deletedFeeds} unused Feeds`);
    } catch (err) {
        console.error("\nError while deleting old feeds: \n" + err);
    }
}

async function isFeedUsed(feedId: string) {
    // Check if feed has articles
    const articles = await prisma.article.findMany({
        where: {
            feedId: feedId
        }
    });

    // Check if any user follows the feed
    const feedLists = await prisma.feedList.findMany({
        where: {
            feedId: feedId
        }
    });

    return articles.length > 0 || feedLists.length > 0;
}

async function deleteOldArticles() {
    try {
        let deletedArticles = 0;

        const articles = await prisma.article.findMany({
            where: {
                OR: [
                    {
                        publishedAt: {
                            lt: new Date(Date.now() - Number(environment.maxArticleAge))
                        }
                    },
                    {
                        createdAt: {
                            lt: new Date(Date.now() - Number(environment.maxArticleAge))
                        }
                    }
                ]

            }
        });

        for (const article of articles) {
            if (!await isArticleUsed(article.id)) {
                await prisma.article.delete({
                    where: {
                        id: article.id
                    }
                });
                deletedArticles++;
            }
        }

        console.log(`Deleted ${deletedArticles} old Articles`);
    } catch (err) {
        console.error("\nError while deleting old articles: \n" + err);
    }
}

async function isArticleUsed(articleId: string) {
    const articleLists = await prisma.articleList.findMany({
        where: {
            articleId: articleId
        }
    });

    let used = false;
    for (const articleList of articleLists) {
        if (articleList.saved || articleList.starred) {
            used = true;
            break;
        }
    }

    return used;
}

async function deleteExpiredArticlesFromReadingList() {
    const now = new Date();

    // Get all user settings to determine the expiration times
    const settings = await prisma.settings.findMany();

    for (const setting of settings) {
        // Calculate the time threshold for read and unread articles based on user settings
        const readExpirationDate = new Date(now.getTime() - setting.expTimeRead);
        const unreadExpirationDate = new Date(now.getTime() - setting.expTimeUnread);

        // Find all articles from the reading list that have expired
        const expiredArticles = await prisma.articleList.findMany({
            where: {
                OR: [
                    {
                        AND: [
                            { userId: setting.userId },
                            { read: true },
                            { dateRead: { lt: readExpirationDate } }
                        ]
                    },
                    {
                        AND: [
                            { userId: setting.userId },
                            { read: false },
                            { dateSaved: { lt: unreadExpirationDate } }
                        ]
                    }
                ]
            },
            select: {
                articleId: true
            }
        });

        // Delete all articles that have expired for this user
        for (const expiredArticle of expiredArticles) {
            await prisma.articleList.update({
                where: {
                    articleId_userId: { // Change this line to match the unique identifier
                        userId: setting.userId,
                        articleId: expiredArticle.articleId
                    }
                },

                data: {
                    saved: false,
                }
            });
        }

    }
    console.log("Expired articles from the reading list have been cleaned up.");
}


