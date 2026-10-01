import { ArticleUpdateInputType, GetArticlesQueryType } from "../validators/articles";
import APIError from "../helper/apiError";
import { getPrismaClient } from "../prismaClient";
import log, { Level, Scope } from "../helper/logger";
import { environment } from "../helper/environment";
import { extractAndStoreContent, toClientArticleContent } from "./articleContent";

const prisma = getPrismaClient();

export async function getArticles(userId: string, query: GetArticlesQueryType) {
    let { limit, feeds, categories, startDate, endDate } = query;

    if (!categories) {
        categories = [];
    }

    const where: any[] = [];

    // Without an explicit feed selection, filter by the user's subscriptions
    // directly instead of loading every feedId first. Same result, one roundtrip
    // less and no large IN list.
    if (feeds) {
        where.push({
            feed: {
                id: {
                    in: feeds
                }
            }
        });
    } else {
        where.push({
            feed: {
                UserHasFeed: {
                    some: {
                        userId: userId
                    }
                }
            }
        });
    }

    if (categories.length !== 0) {
        where.push({
            category: {
                id: {
                    in: categories
                }
            }
        });
    }

    if (startDate) {
        try {
            new Date(startDate);
            if (isNaN(Date.parse(startDate))) {
                throw new Error();
            }
        } catch (error) {
            throw APIError.badRequest("startDate is not a valid date");
        }
        where.push({
            publishedAt: {
                gte: new Date(startDate)
            }
        });
    }

    if (endDate) {
        try {
            new Date(endDate);
            if (isNaN(Date.parse(endDate))) {
                throw new Error();
            }
        } catch (error) {
            throw APIError.badRequest("endDate is not a valid date");
        }
        where.push({
            publishedAt: {
                lte: new Date(endDate)
            }
        });
    }

    const selectQuery: any = {
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
    };

    if (environment.showArticleReaders === 'true') {
        selectQuery.ArticleHasUser = {
            where: {
                read: true,
                userId: {
                    not: userId 
                }
            },
            select: {
                user: {
                    select: {
                        id: true,
                        name: true 
                    }
                }
            }
        };
    }

    const articles = await prisma.article.findMany({
        where: {
            AND: where,
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
        select: selectQuery, 
    });

    return articles;
}

const articleListSelect = {
    read: true,
    saved: true,
    starred: true,
    seen: true,
    dateRead: true,
    dateSaved: true,
    dateStar: true,
    dateSeen: true
} as const;

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
                    faviconUrl: true,
                    description: true
                }
            },
            // Fetch the user's state in the same roundtrip as the article.
            ArticleHasUser: {
                where: { userId },
                take: 1,
                select: articleListSelect
            }
        },
    });

    if (!article) {
        throw APIError.notFound();
    }

    const { ArticleHasUser, ...fields } = article;
    const articleList = ArticleHasUser[0];

    return {
        ...fields,
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

export async function updateArticle(userId: string, articleId: string, input: ArticleUpdateInputType) {
    // Existence check and the user's current state come from one query.
    const article = await prisma.article.findUnique({
        where: {
            id: articleId
        },
        select: {
            id: true,
            ArticleHasUser: {
                where: { userId },
                take: 1,
                select: articleListSelect
            }
        }
    });

    if (!article) {
        throw APIError.notFound();
    }

    const articleList = article.ArticleHasUser[0];

    if (input.read) {
        const settings = await prisma.settings.findFirst({
            where: {
                userId: userId
            }
        });

        if (settings?.expTimeRead === 0) {
            input.saved = false;
        }
    }

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
        },
        include: {
            content: true
        }
    });

    if (!article) {
        log("Article not found", Scope.API, Level.ERROR);
        throw APIError.notFound();
    }

    const stored = article.content;

    if (stored?.status === "OK") {
        return toClientArticleContent(stored);
    }

    // Don't touch the publisher site again when extraction permanently failed
    // or the retry backoff after the last failed attempt hasn't elapsed yet
    const attemptsExhausted = stored?.status === "FAILED" &&
        stored.attempts >= Number(environment.maxExtractionAttempts);
    const backoffActive = stored?.status === "FAILED" && !!stored.lastAttempt &&
        Date.now() - stored.lastAttempt.getTime() < Number(environment.extractionRetryDelay);

    if (attemptsExhausted || backoffActive) {
        log(`Not extracting content of article ${article.link} (attempts: ${stored?.attempts})`, Scope.API, Level.WARN);
        throw APIError.internalServerError(stored?.lastError ?? "Article extraction failed");
    }

    const result = await extractAndStoreContent(article.id, article.link);

    if (result.status !== "OK") {
        throw APIError.internalServerError(result.lastError ?? "Article extraction failed");
    }

    return toClientArticleContent(result);
}