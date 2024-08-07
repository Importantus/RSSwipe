import { defineStore } from 'pinia'
import axios from '@/axios'
import { useHomeStore } from './home';
import { StoreStatus } from './readingList';


// The threshold for the error count of a feed to be considered as broken
// e.g. the notification will be shown if the error count is greater than this value
export const FEED_ERROR_COUNT_THRESHOLD = 3;

export interface FeedItem {
    id: string,
    title: string,
    isFiltered: boolean,
    faviconUrl: string,
    url: string,
    openInApp: boolean,
    error_count: number,
    errormessage?: string,
    description?: string
}

export const useFeedStore = defineStore("feedList", {
    state: () => ({
        feedList: [] as FeedItem[],
        state: StoreStatus.LOADING,
        error: ""
    }),

    getters: {
        filteredFeedList(): FeedItem[] {
            return this.feedList.filter(item => item.isFiltered)
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
                    isFiltered: this.feedList.find(item => item.id === feed.id) ? this.feedList.find(item => item.id === feed.id)!.isFiltered : false,
                    error_count: feed.error_count,
                    errormessage: feed.errormessage,
                    description: feed.description
                }))
            } catch (error: any) {
                this.error = error.response.data.message
                console.log(this.error)
            }
            this.state = StoreStatus.READY
        },
        async addFeed(url: string, openInApp: boolean) {
            this.state = StoreStatus.LOADING
            this.error = ""
            try {
                const response = await axios.post('/feeds', {
                    url,
                    openInApp
                })
                this.feedList.push({
                    id: response.data.id,
                    title: response.data.title,
                    faviconUrl: response.data.faviconUrl,
                    url: response.data.link,
                    openInApp: response.data.openInApp,
                    isFiltered: false,
                    error_count: response.data.error_count,
                    errormessage: response.data.errormessage,
                    description: response.data.description
                })
            } catch (error: any) {
                this.error = error.response.data.message
                console.log(this.error)
            }
            this.state = StoreStatus.READY
        },
        async deleteFeed(id: string) {
            this.state = StoreStatus.LOADING
            await axios.delete(`/feeds/${id}`)
            this.getFeedList()
            this.state = StoreStatus.READY
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
        toggleFeed(id: string) {
            const item = this.feedList.find(item => item.id === id)
            if (item) {
                item.isFiltered = !item.isFiltered
            }
            const startPageStore = useHomeStore()
            startPageStore.reload()
        },
        unselectAll() {
            for (const item of this.feedList) {
                item.isFiltered = false
            }
            const startPageStore = useHomeStore()
            startPageStore.reload()
        },
        isFeedSelected(id: string): boolean {
            const item = this.feedList.find(item => item.id === id)
            return item ? item.isFiltered ? item.isFiltered : false : false
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
