import { defineStore } from 'pinia'
import axios from '@/axios'
import { useStartPageStore } from './startPage';

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
        feedList: [] as FeedItem[]
    }),
    actions: {
        async getFeedList() {
            const response = await axios.get('/feeds')
            if (response.status !== 200) {
                return
            }
            this.feedList = response.data.map((feed: any) => ({
                id: feed.id,
                title: feed.title,
                faviconUrl: feed.faviconUrl,
                url: feed.link,
                openInApp: feed.openInApp,
                filtered: false
            }))
        },
        async addFeed(url: string, openInApp: boolean) {
            const response = await axios.post('/feeds', {
                url,
                openInApp
            })
            if (response.status !== 200) {
                console.log(response);
            }
            this.feedList.push({
                id: response.data.id,
                title: response.data.title,
                faviconUrl: response.data.faviconUrl,
                url: response.data.link,
                openInApp: response.data.openInApp,
                filtered: false
            })
        },
        async deleteFeed(id: string) {
            await axios.delete(`/feeds/${id}`)
            this.getFeedList()
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
        isFeedOpenedInApp(id: string): boolean {
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
