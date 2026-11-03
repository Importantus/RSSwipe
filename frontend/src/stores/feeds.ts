import { defineStore } from 'pinia'
import axios from '@/axios'
import { apiErrorMessage } from '@/apiError'
import { useHomeStore } from './home';
import { StoreStatus } from './readingList';
import { useFeedCategoriesStore } from './feedCategories';

const SELECTION_KEY = 'feedSelection'

function loadSelection(): string[] {
    try {
        const stored = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? '[]')
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
        selectedIds: loadSelection()
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
            const next = [...new Set(ids)].sort()
            const current = [...this.selectedIds].sort()
            if (next.length === current.length && next.every((id, i) => id === current[i])) return
            this.selectedIds = next
            try {
                localStorage.setItem(SELECTION_KEY, JSON.stringify(next))
            } catch {
                // storage unavailable: the selection just is not remembered
            }
            useHomeStore().reload()
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
