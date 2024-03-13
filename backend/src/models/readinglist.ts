import { PrismaClient } from '@prisma/client';
import { updateArticle } from './articles';

const prisma = new PrismaClient();

export async function getReadingList(userId: string) {
    const now = new Date();

    const userSettings = await prisma.settings.findFirst({
        where: {
            userId: userId
        }
    });
    let where = [];

    if (userSettings) {

        // Calculate the time threshold for read and unread articles based on user settings
        const readExpirationDate = new Date(now.getTime() - userSettings.expTimeRead);
        const unreadExpirationDate = new Date(now.getTime() - userSettings.expTimeUnread);

        if (userSettings && userSettings.expTimeRead >= 0) {
            where.push({
                NOT: {
                    AND: [
                        { read: true },
                        { dateRead: { lt: readExpirationDate } }
                    ]
                }
            })
        }

        if (userSettings && userSettings.expTimeUnread >= 0) {
            where.push({
                NOT: {
                    AND: [
                        { read: false },
                        { dateSaved: { lt: unreadExpirationDate } }
                    ]
                }
            })
        }
    }

    const readingList = await prisma.articleList.findMany({
        where: { userId, saved: true, AND: where },
        select: {
            read: true,
            saved: true,
            seen: true,
            starred: true,
            dateRead: true,
            dateSaved: true,
            dateSeen: true,
            dateStar: true,
            article: {
                select: {
                    id: true,
                    title: true,
                    imageUrl: true,
                    link: true,
                    publishedAt: true,
                    createdAt: true,
                    category: true,
                    feed: {
                        select: {
                            id: true,
                            title: true,
                            link: true,
                            faviconUrl: true
                        }
                    }
                },
            },
        },
    });

    return readingList.map((article) => {
        return {
            ...article.article,
            read: article.read,
            saved: article.saved,
            starred: article.starred,
            seen: article.seen,
            dateRead: article.dateRead,
            dateSaved: article.dateSaved,
            dateStarred: article.dateStar,
            dateSeen: article.dateSeen
        };
    });
}

export async function addArticleToReadingList(userId: string, articleId: string) {
    return await updateArticle(userId, articleId, { saved: true });
}

export async function removeArticleFromReadingList(userId: string, articleId: string) {
    return await updateArticle(userId, articleId, { saved: false });
}

export async function removeArticlesFromReadingList(userId: string, onlyRead: boolean) {
    if (onlyRead) {
        return await prisma.articleList.updateMany({
            where: {
                userId,
                read: true,
                saved: true,
            },
            data: {
                saved: false,
                dateSaved: null,
            },
        });
    } else {
        return await prisma.articleList.updateMany({
            where: {
                userId,
                saved: true,
            },
            data: {
                saved: false,
                dateSaved: null,
            },
        });
    }
}
