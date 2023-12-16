import { PrismaClient } from "@prisma/client";
import APIError from "../helper/apiError";
const prisma = new PrismaClient();

export async function getStarredArticles(userId: string) {

    const starredArticles = await prisma.articleList.findMany({
        where: {
            userId: userId,
            starred: true
        }
    });

    if (starredArticles.length === 0) {
        throw APIError.badRequest("The User doesn't have any starred articles");
    }

    return starredArticles;
}

export async function getStarredArticle(articleId: string, userId: string) {

    const starredArticle = await prisma.articleList.findFirst({
        where: {
            articleId: articleId,
            userId: userId,
        }
    });

    if (!starredArticle) {
        throw APIError.badRequest("The User doesn't have an article with this id");
    }

    return starredArticle;
}


export async function updateStarredArticle(articleId: string, userId: string, starArticle: boolean) {

    const articleState = getStarredArticle(articleId, userId)

    if ((await articleState).starred === starArticle) {
        throw APIError.badRequest("This article is already in this state: Starred: " + starArticle);
    }

    await prisma.articleList.update({
        where: {
            articleId_userId: {
                articleId: articleId,
                userId: userId
            }
        },
        data: {
            starred: starArticle
        }
    });
}