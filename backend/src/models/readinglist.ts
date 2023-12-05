import { PrismaClient } from '@prisma/client';
import { updateArticle } from './articles';

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
    return await updateArticle(userId, articleId, { saved: true });
}

export async function removeArticleFromReadingList(userId: string, articleId: string) {
    return await updateArticle(userId, articleId, { saved: false });
}
