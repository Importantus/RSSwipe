import axios from "@/axios";
import type { Article, Settings, StoredArticle, SwipeDirection } from "@/types";
import { defineStore } from "pinia";
import { Trash2 } from 'lucide-vue-next';
import { Star } from 'lucide-vue-next';
import { BookOpenCheck } from "lucide-vue-next";
import { useFeedStore } from "./feeds";

export enum StoreStatus {
    LOADING,
    READY,
    ERROR,
    SUCCESS
}

export interface ArticleUpdateInput {
    read?: boolean;
    saved?: boolean;
    starred?: boolean;
    seen?: boolean;
}

export const possibleSwipeDirections: SwipeDirection[] = [
    {
        id: 'read',
        name: 'Toggle read',
        color: 'green',
        removeCard: false,
        icon: BookOpenCheck,
        action: (article: Article) => {
            const store = useReadingListStore()
            store.updateArticle(article, {
                read: !article.read
            })
        }
    },
    {
        id: 'starred',
        name: 'Toggle starred',
        color: 'orange',
        removeCard: false,
        icon: Star,
        action: (article: Article) => {
            const store = useReadingListStore()
            store.updateArticle(article, {
                starred: !article.starred
            })
        }
    },
    {
        id: 'remove',
        name: 'Remove',
        color: 'red',
        removeCard: true,
        icon: Trash2,
        action: (article: Article) => {
            const store = useReadingListStore()
            store.removeArticle(article)
        }
    }
]

function getSwipeDirection(id: string) {
    return possibleSwipeDirections.find(d => d.id === id)!
}

export const useReadingListStore = defineStore({
    id: 'readingList',
    state: () => ({
        articles: JSON.parse(localStorage.getItem('readinglist') || '[]') as StoredArticle[],
        status: StoreStatus.LOADING,
        settingsStatus: StoreStatus.LOADING,
        removedArticles: [] as Article[],
        settings: {} as Settings,
        swipeLeft: getSwipeDirection(JSON.parse(localStorage.getItem('swipeLeft') || JSON.stringify(possibleSwipeDirections[1].id))) as SwipeDirection,
        swipeRight: getSwipeDirection(JSON.parse(localStorage.getItem('swipeRight') || JSON.stringify(possibleSwipeDirections[2].id))) as SwipeDirection,
        nextArticleSkipRead: JSON.parse(localStorage.getItem('nextArticleSkipRead') || 'true') as boolean
    }),

    actions: {
        async addArticleLocal(article: Article) {
            if (this.articles.findIndex(a => a.articleInfo.id === article.id) === -1) {
                this.articles.unshift({
                    articleInfo: article
                })
            }

            const feedStore = useFeedStore()
            if (await feedStore.isFeedOpenedInApp(article.feed.id)) {
                this.addContentToArticle(article)
            }
        },
        removeArticleLocal(article: Article, undo = true) {
            const index = this.articles.findIndex(a => a.articleInfo.id === article.id)

            if (index !== -1) {
                this.articles.splice(index, 1)
            }

            if (undo) {
                this.removedArticles.push(article)
            }
            localStorage.setItem('readinglist', JSON.stringify(this.articles))
        },
        async update() {
            this.status = StoreStatus.LOADING

            const response = await axios.get('/readinglist')

            if (response.status === 200) {
                const readingList = response.data as Article[]
                for (const article of readingList) {
                    this.addArticleLocal(article)

                    this.articles[this.articles.findIndex(a => a.articleInfo.id === article.id)].articleInfo = article
                }

                for (const article of [...this.articles]) {
                    const index = readingList.findIndex(a => a.id === article.articleInfo.id)
                    if (index === -1) {
                        this.removeArticleLocal(article.articleInfo, false)
                    }
                }

                this.articles.sort((a, b) => {
                    return new Date(b.articleInfo.dateSaved!).getTime() - new Date(a.articleInfo.dateSaved!).getTime()
                })

                this.status = StoreStatus.READY

                localStorage.setItem('readinglist', JSON.stringify(this.articles))
            } else {
                console.log(response)
                this.status = StoreStatus.ERROR
            }
        },
        async addContentToArticle(article: Article) {
            const index = this.articles.findIndex(a => a.articleInfo.id === article.id)

            if (index === -1 || this.articles[index].content) {
                return
            }

            const content = await this.getArticleContent(article)
            console.log("Adding content to article " + article.title)
            this.articles[this.articles.findIndex(a => a.articleInfo.id === article.id)].content = content

            localStorage.setItem('readinglist', JSON.stringify(this.articles))
        },
        async getArticleContent(article: Article) {
            const response = await axios.get(`/articles/${article.id}/content`)

            if (response.status === 200) {
                return response.data
            } else {
                console.log(response)
            }
        },
        async removeArticle(article: Article) {
            axios.delete(`/readinglist/articles`, {
                data: {
                    id: article.id
                }
            })
            this.removeArticleLocal(article)
        },
        async updateArticle(article: Article, input: ArticleUpdateInput) {
            const response = await axios.put(`/articles/` + article.id, {
                ...input
            })

            if (response.status === 200) {
                this.articles[this.articles.findIndex(a => a.articleInfo.id === article.id)].articleInfo = response.data
                localStorage.setItem('readinglist', JSON.stringify(this.articles))
            } else {
                console.log(response)
            }
        },
        async undo() {
            if (this.removedArticles.length === 0) {
                return
            }

            const lastRemovedArticle = this.removedArticles.pop()

            this.addArticleLocal(lastRemovedArticle!)

            axios.post(`/readinglist/articles`, {
                id: lastRemovedArticle!.id
            })
        },
        async loadSettings() {
            this.settingsStatus = StoreStatus.LOADING
            const response = await axios.get('/settings')

            if (response.status === 200) {
                this.settings = response.data
                this.settingsStatus = StoreStatus.READY
            } else {
                console.log(response)
            }
        },
        async updateSettings(settings: Settings) {
            try {
                const response = await axios.put('/settings', settings)
                this.settings = response.data
                this.settingsStatus = StoreStatus.SUCCESS
            } catch (e) {
                console.log(e)
            }
        },
        async clear(onlyRead: boolean) {
            const response = await axios.delete('/readinglist', {
                data: {
                    onlyRead
                }
            })

            if (response.status === 200) {
                this.update()
            } else {
                console.log(response)
            }
        },
        getArticleById(id: string) {
            return this.articles.find(a => a.articleInfo.id === id)
        },
        setSwipeLeft(id: string) {
            this.swipeLeft = getSwipeDirection(id)
            localStorage.setItem('swipeLeft', JSON.stringify(id))
        },
        setSwipeRight(id: string) {
            this.swipeRight = getSwipeDirection(id)
            localStorage.setItem('swipeRight', JSON.stringify(id))
        },
        setNextArticleSkipRead(skip: boolean) {
            this.nextArticleSkipRead = skip
            localStorage.setItem('nextArticleSkipRead', JSON.stringify(skip))
        }
    }
})
