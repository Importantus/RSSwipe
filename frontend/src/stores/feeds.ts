import { defineStore } from 'pinia'
import axios from '@/axios'
import { apiErrorMessage } from '@/apiError'
import { useHomeStore } from './home';
import { StoreStatus } from './readingList';
import { cycleCategoryIn, useFeedCategoriesStore, type FeedCategory } from './feedCategories';

const SELECTION_KEY = 'feedSelection'
const MUTED_KEY = 'mutedCategories'

function loadSelection(key = SELECTION_KEY): string[] {
    try {
        const stored = JSON.parse(localStorage.getItem(key) ?? '[]')
        return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : []
    } catch {
        return []
    }
}


// The threshold for the error count of a feed to be considered as broken
// e.g. the notification will be shown if the error count is greater than this value
export const FEED_ERROR_COUNT_THRESHOLD = 3;

export interface FeedItem {
    id: string,
    title: string,
    faviconUrl: string,
    url: string,
    openInApp: boolean,
    error_count: number,
    errormessage?: string,
    description?: string
}

export interface ImportResult {
    imported: number,
    skipped: number,
    failed: { url: string, reason: string }[]
}

export const useFeedStore = defineStore("feedList", {
    state: () => ({
        feedList: [] as FeedItem[],
        state: StoreStatus.LOADING,
        error: "",
        // Feeds the home screen swipes through (empty = all feeds). Remembered across restarts.
        selectedIds: loadSelection(),
        // Categories the user hides from the home screen, e.g. politics on a bad day. Hiding wins over selecting.
        mutedCategoryIds: loadSelection(MUTED_KEY)
    }),

    getters: {
        filteredFeedList(): FeedItem[] {
            return this.feedList.filter(item => this.selectedIds.includes(item.id))
        }
    },

    actions: {
        async getFeedList() {
            StoreStatus.LOADING
            this.error = ""
            try {
                const response = await axios.get('/feeds')
                this.feedList = response.data.map((feed: any): FeedItem => ({
                    id: feed.id,
                    title: feed.title,
                    faviconUrl: feed.faviconUrl,
                    url: feed.link,
                    openInApp: feed.openInApp,
                    error_count: feed.error_count,
                    errormessage: feed.errormessage,
                    description: feed.description
                }))
                this.pruneSelection()
            } catch (error: any) {
                this.error = await apiErrorMessage(error, "Request failed")
                console.log(this.error)
            }
            this.state = StoreStatus.READY
        },
        async addFeed(url: string, openInApp: boolean): Promise<FeedItem | null> {
            this.state = StoreStatus.LOADING
            this.error = ""
            try {
                const response = await axios.post('/feeds', {
                    url,
                    openInApp
                })
                const item: FeedItem = {
                    id: response.data.id,
                    title: response.data.title,
                    faviconUrl: response.data.faviconUrl,
                    url: response.data.link,
                    openInApp: response.data.openInApp,
                    error_count: response.data.error_count,
                    errormessage: response.data.errormessage,
                    description: response.data.description
                }
                this.feedList.push(item)
                this.state = StoreStatus.READY
                return item
            } catch (error: any) {
                this.error = await apiErrorMessage(error, "Request failed")
                console.log(this.error)
            }
            this.state = StoreStatus.READY
            return null
        },
        async deleteFeed(id: string) {
            this.state = StoreStatus.LOADING
            try {
                await axios.delete(`/feeds/${id}`)
                this.feedList = this.feedList.filter(item => item.id !== id)
                useFeedCategoriesStore().forgetFeed(id)
                this.pruneSelection()
            } catch (error: any) {
                this.error = await apiErrorMessage(error, "Request failed")
            }
            this.state = StoreStatus.READY
        },
        async exportOpml(): Promise<void> {
            this.state = StoreStatus.LOADING
            this.error = ""
            try {
                const response = await axios.get('/feeds/export', { responseType: 'blob' })
                const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/x-opml' }))
                const link = document.createElement('a')
                link.href = url
                link.download = 'feeds.opml'
                link.click()
                window.URL.revokeObjectURL(url)
            } catch (error: any) {
                this.error = await apiErrorMessage(error, "Export failed")
                console.log(this.error)
            }
            this.state = StoreStatus.READY
        },
        async importOpml(file: File): Promise<ImportResult | null> {
            this.state = StoreStatus.LOADING
            this.error = ""
            let result: ImportResult | null = null
            try {
                const xml = await file.text()
                const response = await axios.post('/feeds/import', xml, {
                    headers: {
                        'Content-Type': 'text/xml'
                    }
                })
                result = response.data
                await this.getFeedList()
            } catch (error: any) {
                this.error = await apiErrorMessage(error, "Import failed")
                console.log(this.error)
            }
            this.state = StoreStatus.READY
            return result
        },
/** Fetches the feed right now. Returns the updated feed, or null if the request failed. */
        async retryFeed(id: string): Promise<FeedItem | null> {
            this.error = ""
            try {
                const response = await axios.post(`/feeds/${id}/retry`)
                const item = this.feedList.find(feed => feed.id === id)
                if (item) {
                    item.title = response.data.title
                    item.faviconUrl = response.data.faviconUrl
                    item.error_count = response.data.error_count
                    item.errormessage = response.data.errormessage ?? undefined
                    item.description = response.data.description
                }
                return item ?? null
            } catch (error: any) {
                this.error = await apiErrorMessage(error, "Request failed")
                return null
            }
        },
        async toggleOpenInApp(id: string) {
            const item = this.feedList.find(item => item.id === id)
            if (item) {
                item.openInApp = !item.openInApp
                await axios.put(`/feeds/${id}`, {
                    openInApp: item.openInApp
                })
            }
        },
        /** Sets the feeds the home screen shows. An empty list means all feeds. */
        setSelection(ids: Iterable<string>) {
            this.setFilter(ids, this.mutedCategoryIds)
        },
        /** Sets which feeds are shown (empty = all) and which categories are hidden, with a single reload. */
        setFilter(ids: Iterable<string>, mutedCategories: Iterable<string>) {
            const next = [...new Set(ids)].sort()
            const nextMuted = [...new Set(mutedCategories)].sort()
            const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])
            const selectionSame = same(next, [...this.selectedIds].sort())
            const mutedSame = same(nextMuted, [...this.mutedCategoryIds].sort())
            if (selectionSame && mutedSame) return
            this.selectedIds = next
            this.mutedCategoryIds = nextMuted
            try {
                localStorage.setItem(SELECTION_KEY, JSON.stringify(next))
                localStorage.setItem(MUTED_KEY, JSON.stringify(nextMuted))
            } catch {
                // storage unavailable: the filter just is not remembered
            }
            useHomeStore().reload()
        },
        /** A tap on a category chip, see `cycleCategoryIn` */
        cycleCategory(category: FeedCategory) {
            const next = cycleCategoryIn(category, this.selectedIds, this.mutedCategoryIds)
            this.setFilter(next.ids, next.muted)
        },
        isMuted(categoryId: string): boolean {
            return this.mutedCategoryIds.includes(categoryId)
        },
        /** Back to showing everything */
        resetFilter() {
            this.setFilter([], [])
        },
        /**
         * The feed ids to request articles for: the selection (empty = all) without the feeds of hidden categories.
         * `nothingLeft` is set when hiding leaves no feed at all, as an empty list would mean "all feeds".
         */
        async resolveFilter(): Promise<{ ids: string[]; nothingLeft: boolean }> {
            const muted = this.mutedCategoryIds
            if (muted.length === 0) return { ids: this.selectedIds, nothingLeft: false }
            const categories = useFeedCategoriesStore()
            if (!categories.loaded) await categories.fetch()
            const hidden = new Set(categories.categories.filter(c => muted.includes(c.id)).flatMap(c => c.feedIds))
            if (hidden.size === 0) return { ids: this.selectedIds, nothingLeft: false }
            if (this.selectedIds.length === 0 && this.feedList.length === 0) await this.getFeedList()
            const base = this.selectedIds.length > 0 ? this.selectedIds : this.feedList.map(item => item.id)
            const ids = base.filter(id => !hidden.has(id))
            return { ids, nothingLeft: ids.length === 0 && base.length > 0 }
        },
        toggleFeed(id: string) {
            this.setSelection(this.selectedIds.includes(id)
                ? this.selectedIds.filter(selected => selected !== id)
                : [...this.selectedIds, id])
        },
        unselectAll() {
            this.setSelection([])
        },
        isFeedSelected(id: string): boolean {
            return this.selectedIds.includes(id)
        },
        /** Forget selected feeds the user does not follow (any more) */
        pruneSelection() {
            const known = new Set(this.feedList.map(item => item.id))
            const kept = this.selectedIds.filter(id => known.has(id))
            if (kept.length !== this.selectedIds.length) this.setSelection(kept)
        },
        async isFeedOpenedInApp(id: string): Promise<boolean> {
            if (this.feedList.length === 0) await this.getFeedList()
            const item = this.feedList.find(item => item.id === id)
            let openInApp = true
            if (item && item.openInApp !== undefined) {
                openInApp = item.openInApp
            }
            return openInApp
        },
        someFeedHasError(): boolean {
            return this.feedList.some(item => item.error_count > FEED_ERROR_COUNT_THRESHOLD);
        },
        isSubscribed(id: string): boolean {
            return this.feedList.some(item => item.id === id);
        }
    }
});
