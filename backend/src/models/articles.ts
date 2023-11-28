import { PrismaClient } from "@prisma/client";
import { ArticleUpdateInputType, GetArticlesQueryType } from "../validators/articles";
import APIError from "../helper/apiError";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import axios from "axios";


const prisma = new PrismaClient();

export async function getArticles(userId: string, query: GetArticlesQueryType) {
    let { limit, feeds } = query;


    if (!feeds) {
        const feedList = await prisma.feedList.findMany({
            where: {
                userId: userId
            }
        });

        feeds = feedList?.map(feed => feed.feedId) ?? [];
    }


    const articles = await prisma.article.findMany({
        where: {
            feed: {
                id: {
                    in: feeds
                }
            }
        },
        take: Number(limit),
        orderBy: {
            publishedAt: "desc"
        },
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
    });

    // Check if article is in the users articleList and has seen set to true
    for (const article of articles) {
        const articleList = await prisma.articleList.findUnique({
            where: {
                articleId_userId: {
                    userId,
                    articleId: article.id
                }
            }
        });

        // If it is seen, remove the article from the response
        if (articleList?.seen) {
            articles.splice(articles.indexOf(article), 1);
        }
    }


    return articles;
}

export async function getArticle(userId: string, articleId: string) {
    const article = await prisma.article.findUnique({
        where: {
            id: articleId
        },
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
    });

    const articleList = await prisma.articleList.findUnique({
        where: {
            articleId_userId: {
                userId,
                articleId
            }
        }
    });

    return {
        ...article,
        read: articleList?.read ?? false,
        saved: articleList?.saved ?? false,
        starred: articleList?.starred ?? false,
        dateRead: articleList?.dateRead ?? null,
        dateSaved: articleList?.dateSaved ?? null,
        dateStarred: articleList?.dateStar ?? null
    };
}

export async function updateArticle(userId: string, articleId: string, input: ArticleUpdateInputType) {
    const articleList = await prisma.articleList.findUnique({
        where: {
            articleId_userId: {
                userId,
                articleId
            }
        }
    });

    if (!articleList) {
        await prisma.articleList.create({
            data: {
                userId,
                articleId,
                read: input.read ?? false,
                seen: input.seen ?? false,
                starred: input.starred ?? false,
                saved: input.saved ?? false,
                dateRead: input.read ? new Date() : null,
                dateSaved: input.saved ? new Date() : null,
                dateStar: input.starred ? new Date() : null,
                dateSeen: input.seen ? new Date() : null
            }
        });
    } else {
        await prisma.articleList.update({
            where: {
                articleId_userId: {
                    userId,
                    articleId
                }
            },
            data: {
                read: input.read ?? false,
                seen: input.seen ?? false,
                starred: input.starred ?? false,
                saved: input.saved ?? false,
                dateRead: input.read ? new Date() : null,
                dateSaved: input.saved ? new Date() : null,
                dateStar: input.starred ? new Date() : null,
                dateSeen: input.seen ? new Date() : null
            }
        });
    }
}

export async function getArticleContent(articleId: string) {
    const article = await prisma.article.findUnique({
        where: {
            id: articleId
        }
    });

    if (!article) {
        console.log("Article not found");
        throw APIError.notFound();
    }

    const response = await axios.get(article.link);
    const doc = new JSDOM(response.data, {
        url: article.link
    });

    const reader = new Readability(doc.window.document);
    const articleContent = reader.parse();

    return articleContent;
}