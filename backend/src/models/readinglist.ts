import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getReadingList(userId: string) {
    return await prisma.articleList.findMany({
        where: { userId, saved: true },
        select: {
            article: {
                select: {
                    id: true,
                    title: true,
                    imageUrl: true,
                    link: true,
                    publishedAt: true,
                    createdAt: true,
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
}

export async function addArticleToReadingList(userId: string, articleId: string) {
    const articleList = await prisma.articleList.findUnique({
        where: {
            articleId_userId: {
                userId,
                articleId,
            },
        },
    });

    if (articleList) {
        return await prisma.articleList.update({
            where: {
                articleId_userId: {
                    userId,
                    articleId,
                },
            },
            data: { saved: true },
        });
    } else {
        return await prisma.articleList.create({
            data: {
                saved: true,
                article: { connect: { id: articleId } },
                user: { connect: { id: userId } },
            },
        });
    }
}

export async function removeArticleFromReadingList(userId: string, articleId: string) {
    return await prisma.articleList.update({
        where: {
            articleId_userId: {
                userId,
                articleId,
            },
        },
        data: { saved: false },
    });
}
