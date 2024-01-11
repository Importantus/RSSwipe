import { PrismaClient } from "@prisma/client";
import { ArticleUpdateInputType, GetArticlesQueryType } from "../validators/articles";
import APIError from "../helper/apiError";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import axios from "axios";
import { getPrismaClient } from "../prismaClient";
import { getDomFromUrl } from "../helper/htmlParsing";


const prisma = getPrismaClient();

export async function getArticles(userId: string, query: GetArticlesQueryType) {
    let { limit, feeds, categories } = query;


    if (!feeds) {
        const feedList = await prisma.feedList.findMany({
            where: {
                userId: userId
            }
        });

        feeds = feedList?.map(feed => feed.feedId) ?? [];
    }

    if (!categories) {
        categories = [];
    }

    let whereFeedsAndCategories = {}

    if (categories.length === 0) {
        whereFeedsAndCategories = [
            {
                feed: {
                    id: {
                        in: feeds
                    }
                }
            }
        ];
    } else {
        whereFeedsAndCategories = [
            {
                category: {
                    id: {
                        in: categories
                    }
                }
            },
            {
                feed: {
                    id: {
                        in: feeds
                    }
                }
            }
        ]
    }

    const articles = await prisma.article.findMany({
        where: {
            AND: whereFeedsAndCategories,
            OR: [
                {
                    ArticleHasUser: {
                        some: {
                            userId: userId,
                            seen: false
                        }
                    }
                },
                {
                    NOT: {
                        ArticleHasUser: {
                            some: {
                                userId: userId
                            }
                        }
                    }
                }

            ]
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
    });

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
    });

    if (!article) {
        throw APIError.notFound();
    }

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
        seen: articleList?.seen ?? false,
        dateRead: articleList?.dateRead ?? null,
        dateSaved: articleList?.dateSaved ?? null,
        dateStarred: articleList?.dateStar ?? null,
        dateSeen: articleList?.dateSeen ?? null
    };
}

export async function updateArticle(userId: string, articleId: string, input: ArticleUpdateInputType) {    // Check if article exists
    const article = await prisma.article.findUnique({
        where: {
            id: articleId
        }
    });

    if (!article) {
        throw APIError.notFound();
    }

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
                read: input.read ?? articleList.read,
                seen: input.seen ?? articleList.seen,
                starred: input.starred ?? articleList.starred,
                saved: input.saved ?? articleList.saved,
                dateRead: input.read ? new Date() : articleList.dateRead,
                dateSaved: input.saved ? new Date() : articleList.dateSaved,
                dateStar: input.starred ? new Date() : articleList.dateStar,
                dateSeen: input.seen ? new Date() : articleList.dateSeen
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

    const dom = await getDomFromUrl(article.link);

    const reader = new Readability(dom.window.document);
    const articleContent = reader.parse();

    // Check if parsing was successful
    if (!articleContent) {
        console.log("Parsing failed");
        throw APIError.internalServerError("Article parsing failed");
    }

    return articleContent;
}