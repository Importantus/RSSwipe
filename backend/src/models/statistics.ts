import { environment } from "../helper/environment";
import { getPrismaClient } from "../prismaClient";

const prisma = getPrismaClient();

export async function getNumbersSinceMaxAge(userId: string) {
    const maxAge = Number(environment.maxArticleAge);

    const now = new Date();

    const allArticles = await prisma.articleList.findMany({
        where: {
            userId: userId,
            article: {
                publishedAt: {
                    gte: new Date(now.getTime() - maxAge)
                }
            }
        },
        select: {
            articleId: true,
            read: true,
            starred: true,
            seen: true,
            saved: true,
            dateRead: true,
            dateStar: true,
            dateSeen: true,
            dateSaved: true,
            article: {
                select: {
                    feed: {
                        select: {
                            id: true
                        }
                    }
                }
            }
        }
    });

    // For each day from now to maxAge ago, count the number of articles seen, read, starred and saved
    const days = [];
    for (let i = 0; i * 24 * 60 * 60 * 1000 < maxAge; i++) {
        days.push({
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            seen: 0,
            read: 0,
            starred: 0,
            saved: 0
        });
    }

    const subsribedFeeds = await prisma.feedList.findMany({
        where: {
            userId: userId
        },
        select: {
            feedId: true,
            feed: {
                select: {
                    faviconUrl: true,
                    title: true
                }
            }
        }
    });

    const feeds = []
    for (const feed of subsribedFeeds) {
        feeds.push({
            feedId: feed.feedId,
            faviconUrl: feed.feed.faviconUrl,
            title: feed.feed.title,
            read: 0
        });
    }

    // For each article, increment the corresponding day's counters
    for (const article of allArticles) {
        if (article.seen && article.dateSeen) {
            const day = days.find(day => day.date.getDate() === article.dateSeen!.getDate());
            if (day) {
                day.seen++;
            }
        }
        if (article.read && article.dateRead) {
            const day = days.find(day => day.date.getDate() === article.dateRead!.getDate());
            if (day) {
                day.read++;
            }
        }
        if (article.starred && article.dateStar) {
            const day = days.find(day => day.date.getDate() === article.dateStar!.getDate());
            if (day) {
                day.starred++;
            }
        }
        if (article.saved && article.dateSaved) {
            const day = days.find(day => day.date.getDate() === article.dateSaved!.getDate());
            if (day) {
                day.saved++;
            }
        }

        const feed = feeds.find(feed => feed.feedId === article.article.feed.id);
        if (feed && article.read) {
            feed.read++;
        }
    }

    return {
        dateSince: new Date(now.getTime() - maxAge),
        totalSeen: days.reduce((acc, day) => acc + day.seen, 0),
        totalRead: days.reduce((acc, day) => acc + day.read, 0),
        totalStarred: days.reduce((acc, day) => acc + day.starred, 0),
        totalSaved: days.reduce((acc, day) => acc + day.saved, 0),
        days: days,
        feeds: feeds
    }
} 