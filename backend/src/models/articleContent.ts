import { Readability } from "@mozilla/readability";
import type { ArticleContent } from "@prisma/client";
import type { JSDOM } from "jsdom";
import { getPrismaClient } from "../prismaClient";
import { getDomFromUrl } from "../helper/htmlParsing";
import log, { Level, Scope } from "../helper/logger";

const prisma = getPrismaClient();

/**
 * Extractions currently running, keyed by article id.
 * Concurrent requests for the same article share one extraction
 * instead of fetching the publisher site twice and racing on the upsert.
 */
const inFlightExtractions = new Map<string, Promise<ArticleContent>>();

function truncate(text: string, length: number) {
    return text.length > length ? text.substring(0, length) : text;
}

/**
 * Map an ArticleContent row to the shape the client expects
 * inside the content wrapper of the content endpoints
 */
export function toClientArticleContent(content: ArticleContent) {
    return {
        title: content.title,
        content: content.content,
        textContent: content.textContent,
        excerpt: content.excerpt,
        byline: content.byline,
        dir: content.dir,
        siteName: content.siteName,
        lang: content.lang,
        length: content.length
    };
}

function parseArticleData(document: JSDOM["window"]["document"]) {
    const reader = new Readability(document);
    const parsed = reader.parse();

    if (!parsed) {
        throw new Error("Parsing failed");
    }

    return {
        title: parsed.title,
        content: parsed.content,
        textContent: parsed.textContent,
        excerpt: parsed.excerpt,
        byline: parsed.byline,
        dir: parsed.dir,
        siteName: parsed.siteName,
        lang: parsed.lang,
        length: parsed.length
    };
}

/**
 * Extract the readable content of an article and persist it.
 * Publisher-side failures (network, parsing) never throw - they are stored on the ArticleContent row
 * and attempts is incremented either way.
 * Persistence errors (e.g. database issues) are not treated as extraction failures and propagate to the caller.
 * Concurrent extractions of the same article share a single run.
 * @param articleId The id of the article
 * @param link The link of the article page
 * @param dom Optional pre-fetched dom of the article page. If set, no http request is made
 */
export async function extractAndStoreContent(articleId: string, link: string, dom?: JSDOM): Promise<ArticleContent> {
    const pending = inFlightExtractions.get(articleId);
    if (pending) {
        return pending;
    }
    const extraction = performExtraction(articleId, link, dom).finally(() => {
        inFlightExtractions.delete(articleId);
    });
    inFlightExtractions.set(articleId, extraction);
    return extraction;
}

async function performExtraction(articleId: string, link: string, dom?: JSDOM): Promise<ArticleContent> {
    const now = new Date();
    let data: ReturnType<typeof parseArticleData>;

    try {
        const pageDom = dom ?? await getDomFromUrl(link, {
            correctUrls: true
        });

        data = parseArticleData(pageDom.window.document);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`Error extracting content of article ${link}: ${message}`, Scope.API, Level.WARN);

        return await prisma.articleContent.upsert({
            where: {
                articleId
            },
            create: {
                articleId,
                status: "FAILED",
                attempts: 1,
                lastError: truncate(message, 500),
                lastAttempt: now
            },
            update: {
                status: "FAILED",
                attempts: {
                    increment: 1
                },
                lastError: truncate(message, 500),
                lastAttempt: now
            }
        });
    }

    return await prisma.articleContent.upsert({
        where: {
            articleId
        },
        create: {
            articleId,
            ...data,
            status: "OK",
            fetchedAt: now
        },
        update: {
            ...data,
            status: "OK",
            lastError: null,
            fetchedAt: now
        }
    });
}

/**
 * Get the stored content of multiple articles without any live extraction.
 * Ids without successfully extracted content are mapped to null.
 */
export async function getArticlesContent(ids: string[]): Promise<Record<string, object | null>> {
    const rows = await prisma.articleContent.findMany({
        where: {
            articleId: {
                in: ids
            },
            status: "OK"
        }
    });

    const rowsById = new Map(rows.map(row => [row.articleId, row]));

    return Object.fromEntries(
        ids.map(id => [id, rowsById.has(id) ? toClientArticleContent(rowsById.get(id)!) : null])
    );
}
