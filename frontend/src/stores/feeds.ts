import { defineStore } from 'pinia'
import axios from '@/axios'
import { useStartPageStore } from './startPage';
import { StoreStatus } from './readingList';

export interface FeedItem {
    id: string,
    title: string,
    filtered?: boolean,
    faviconUrl: string,
    url: string,
    openInApp: boolean
}

export const useFeedStore = defineStore("feedList", {
    state: () => ({
        feedList: [] as FeedItem[],
        state: StoreStatus.LOADING,
        error: ""
    }),
    actions: {
        async getFeedList() {
            StoreStatus.LOADING
            this.error = ""

            try {
                const response = await axios.get('/feeds')

                this.feedList = response.data.map((feed: any) => ({
                    id: feed.id,
                    title: feed.title,
                    faviconUrl: feed.faviconUrl,
                    url: feed.link,
                    openInApp: feed.openInApp,
                    filtered: this.feedList.find(item => item.id === feed.id) ? this.feedList.find(item => item.id === feed.id)!.filtered : false
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
                    filtered: false
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
                item.filtered = !item.filtered
            }

            const startPageStore = useStartPageStore()
            startPageStore.reload()
        },
        unselectAll() {
            for (const item of this.feedList) {
                item.filtered = false
            }

            const startPageStore = useStartPageStore()
            startPageStore.reload()
        },
        isFeedSelected(id: string): boolean {
            const item = this.feedList.find(item => item.id === id)
            return item ? item.filtered ? item.filtered : false : false
        },
        async isFeedOpenedInApp(id: string): Promise<boolean> {
            if (this.feedList.length === 0) await this.getFeedList()

            const item = this.feedList.find(item => item.id === id)
            let openInApp = true
            if (item && item.openInApp !== undefined) {
                openInApp = item.openInApp
            }
            return openInApp
        }
    },
    getters: {
        filteredFeedList(): FeedItem[] {
            return this.feedList.filter(item => item.filtered)
        }
    }
});
