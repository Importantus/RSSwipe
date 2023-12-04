import { PrismaClient } from "@prisma/client";
import { environment } from "../helper/environment";

const prisma = new PrismaClient();

export function initGarbageCollector(intervall = environment.garbageCollectorInterval) {
    console.log("Initialising garbage collector with interval of " + intervall + "ms");
    setInterval(async () => {
        try {
            await deleteOldArticles();
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
                createdAt: {
                    lt: new Date(Date.now() - environment.timeToDeleteOldArticles)
                }
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