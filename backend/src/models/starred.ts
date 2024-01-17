import { PrismaClient } from "@prisma/client";
import APIError from "../helper/apiError";
import { updateArticle } from "./articles";
const prisma = new PrismaClient();

export async function getStarredArticles(userId: string) {
    const starredList = await prisma.articleList.findMany({
        where: { userId, starred: true },
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

    console.log(starredList)

    return starredList.map((article) => {
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

    updateArticle(userId, articleId, { starred: starArticle });
}
