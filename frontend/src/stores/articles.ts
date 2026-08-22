import axios from "@/axios";
import type { Article, ArticleContent, StoredArticle } from "@/types";
import { defineStore } from "pinia";

const STORAGE_KEY = 'articlesStore'
const PREFETCH_STORAGE_KEY = 'prefetchContent'
export const CONTENT_BATCH_SIZE = 50
const MAX_CACHED_ARTICLES = 500
const PERSIST_DEBOUNCE_MS = 250

const pendingArticleRequests = new Map<string, Promise<Article>>()
const pendingContentRequests = new Map<string, Promise<ArticleContent | null>>()

let persistTimer: ReturnType<typeof setTimeout> | undefined

function hasKey(record: Record<string, unknown>, key: string) {
    return Object.prototype.hasOwnProperty.call(record, key)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStoredArticle(value: unknown): value is StoredArticle {
    const articleInfo = isPlainObject(value) ? value.articleInfo : undefined
    return isPlainObject(articleInfo) && typeof articleInfo.id === 'string'
}

function mergeDefined(target: Article, source: Partial<Article>) {
    const record = target as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(source)) {
        if (value === undefined) continue
        record[key] = value
    }
}

function loadPersistedStore(): { articles: Record<string, Article>; content: Record<string, ArticleContent | null> } {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
        return {
            articles: (isPlainObject(parsed?.articles) ? parsed.articles : {}) as Record<string, Article>,
            content: (isPlainObject(parsed?.content) ? parsed.content : {}) as Record<string, ArticleContent | null>
        }
    } catch {
        return { articles: {}, content: {} }
    }
}

export function loadPersistedListIds(key: string): string[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
        return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []
    } catch {
        return []
    }
}

function readLegacyStoredArticles(key: string): StoredArticle[] | null {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return null
        if (parsed.every(item => typeof item === 'string')) return null
        return parsed.filter(isStoredArticle)
    } catch {
        return null
    }
}

export const useArticlesStore = defineStore({
    id: 'articles',
    state: () => ({
        ...loadPersistedStore(),
        prefetchEnabled: JSON.parse(localStorage.getItem(PREFETCH_STORAGE_KEY) ?? 'true') as boolean,
        protectedIds: {} as Record<string, string[]>
    }),

    actions: {
        upsert(article: Article) {
            const existing = this.articles[article.id]
            if (existing) {
                mergeDefined(existing, article)
            } else {
                this.articles[article.id] = { ...article }
            }
            this.schedulePersist()
        },
        upsertMany(articles: Article[]) {
            for (const article of articles) {
                this.upsert(article)
            }
        },
        get(id: string) {
            return this.articles[id]
        },
        async ensure(id: string): Promise<Article> {
            const known = this.articles[id]
            if (known) return known
            const pending = pendingArticleRequests.get(id)
            if (pending) return pending
            const request = axios.get(`/articles/${id}`).then(response => {
                const article = response.data as Article
                this.upsert(article)
                return article
            }).finally(() => {
                pendingArticleRequests.delete(id)
            })
            pendingArticleRequests.set(id, request)
            return request
        },
        patchLocal(id: string, input: Partial<Article>) {
            const existing = this.articles[id]
            if (!existing) return
            mergeDefined(existing, input)
            this.schedulePersist()
        },
        async patch(id: string, input: Partial<Article>): Promise<Article | undefined> {
            const snapshot = this.articles[id] ? { ...this.articles[id] } : undefined
            this.patchLocal(id, input)
            try {
                const response = await axios.put(`/articles/${id}`, input)
                const article = response.data as Article
                this.patchLocal(id, article)
                return article
            } catch (error) {
                if (snapshot) {
                    this.patchLocal(id, snapshot)
                }
                throw error
            }
        },
        async getContent(id: string): Promise<ArticleContent | null> {
            const cached = this.content[id]
            if (cached !== undefined && cached !== null) return cached
            const pending = pendingContentRequests.get(id)
            if (pending) return pending
            const request = axios.get(`/articles/${id}/content`).then(response => {
                const content = response.data as ArticleContent
                this.content[id] = content
                this.schedulePersist()
                return content
            }).finally(() => {
                pendingContentRequests.delete(id)
            })
            pendingContentRequests.set(id, request)
            return request
        },
        async loadBatch(ids: string[]) {
            const missing = ids.filter(id => !hasKey(this.content, id))
            for (let i = 0; i < missing.length; i += CONTENT_BATCH_SIZE) {
                const chunk = missing.slice(i, i + CONTENT_BATCH_SIZE)
                try {
                    const response = await axios.post('/articles/content', { ids: chunk })
                    for (const [id, content] of Object.entries(response.data)) {
                        if (!hasKey(this.content, id)) {
                            this.content[id] = content as ArticleContent | null
                        }
                    }
                } catch (error) {
                    console.debug('Failed to load article content batch', error)
                }
            }
            this.schedulePersist()
        },
        async prefetch(ids: string[]) {
            if (!this.prefetchEnabled || ids.length === 0) return
            await this.loadBatch(ids)
        },
        setPrefetchEnabled(enabled: boolean) {
            this.prefetchEnabled = enabled
            localStorage.setItem(PREFETCH_STORAGE_KEY, JSON.stringify(enabled))
        },
        setProtectedIds(owner: string, ids: string[]) {
            this.protectedIds[owner] = ids
        },
        prune(keepIds: string[] = []) {
            const keep = new Set(keepIds)
            for (const ids of Object.values(this.protectedIds)) {
                for (const id of ids) keep.add(id)
            }
            for (const id of Object.keys(this.content)) {
                if (!keep.has(id)) {
                    delete this.content[id]
                }
            }
            const allIds = Object.keys(this.articles)
            if (allIds.length <= MAX_CACHED_ARTICLES) {
                return
            }
            let excess = allIds.length - MAX_CACHED_ARTICLES
            for (const id of allIds) {
                if (excess <= 0 || keep.has(id)) continue
                delete this.articles[id]
                excess--
            }
            this.schedulePersist()
        },
        schedulePersist() {
            if (persistTimer !== undefined) {
                clearTimeout(persistTimer)
            }
            persistTimer = setTimeout(() => {
                persistTimer = undefined
                this.persistNow()
            }, PERSIST_DEBOUNCE_MS)
        },
        persistNow() {
            const keep = new Set<string>()
            for (const ids of Object.values(this.protectedIds)) {
                for (const id of ids) keep.add(id)
            }
            const articles: Record<string, Article> = {}
            for (const id of Object.keys(this.articles)) {
                if (keep.has(id)) articles[id] = this.articles[id]
            }
            const content: Record<string, ArticleContent | null> = {}
            for (const id of Object.keys(this.content)) {
                if (keep.has(id)) content[id] = this.content[id]
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, articles, content }))
        }
    }
})

export function toStoredArticle(id: string): StoredArticle | undefined {
    const store = useArticlesStore()
    const article = store.articles[id]
    if (!article) {
        return undefined
    }
    return {
        articleInfo: article,
        content: store.content[id] ?? undefined
    }
}

export function migrateLegacyArticleStorage() {
    const store = useArticlesStore()
    for (const listKey of ['readinglist', 'starred']) {
        const legacy = readLegacyStoredArticles(listKey)
        if (!legacy) continue
        const migratedIds = loadPersistedListIds(listKey)
        for (const stored of legacy) {
            store.upsert(stored.articleInfo)
            if (stored.content && !hasKey(store.content, stored.articleInfo.id)) {
                store.content[stored.articleInfo.id] = stored.content
            }
            if (!migratedIds.includes(stored.articleInfo.id)) {
                migratedIds.push(stored.articleInfo.id)
            }
        }
        localStorage.setItem(listKey, JSON.stringify(migratedIds))
    }
    store.setProtectedIds('readingList', loadPersistedListIds('readinglist'))
    store.setProtectedIds('starredList', loadPersistedListIds('starred'))
    store.persistNow()
}
