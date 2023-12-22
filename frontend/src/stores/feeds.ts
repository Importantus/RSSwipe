import { defineStore } from 'pinia'
import axios from '@/axios'

//Schnittstelle, um einen Artikel in einem Benutzer-Feed anzuzeigen
export interface FeedItem {
    id: string,
    title: string,
    filtered?: boolean,
    faviconUrl: string,
    url: string,
    openInApp: boolean
}


export const userFeedItem = defineStore("feedList", {
    state: () => ({
        feedList: [] as FeedItem[]
    }),
    actions: {
        async addFeed(url: string, openInApp: boolean) {
            const response = await axios.post('/feeds', {
                url,
                openInApp
            })

            // Check if response is valid
            if (response.status !== 200) {
                return
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
        },
        async getFeedList() {
            const response = await axios.get('/feeds')

            // Check if response is valid
            if (response.status !== 200) {
                return
            }

            console.log(response.data)

            this.feedList = response.data.map((feed: any) => ({
                id: feed.id,
                title: feed.title,
                faviconUrl: feed.faviconUrl,
                url: feed.link,
                openInApp: feed.openInApp,
                filtered: false
            }))
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
        }
    },
    getters: {
        getFilteredFeedList(): FeedItem[] {
            return this.feedList.filter(item => item.filtered)
        }
    }
});
