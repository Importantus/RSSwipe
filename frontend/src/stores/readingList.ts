import axios from "@/axios";
import type { Article, Settings, StoredArticle, SwipeDirection } from "@/types";
import { defineStore } from "pinia";
import { Trash2 } from 'lucide-vue-next';
import { Star } from 'lucide-vue-next';
import { BookOpenCheck } from "lucide-vue-next";
import { loadPersistedListIds, toStoredArticle, useArticlesStore } from "./articles";

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
        articleIds: loadPersistedListIds('readinglist'),
        status: StoreStatus.LOADING,
        settingsStatus: StoreStatus.LOADING,
        removedArticles: [] as Article[],
        settings: {} as Settings,
        swipeLeft: getSwipeDirection(JSON.parse(localStorage.getItem('swipeLeft') || JSON.stringify(possibleSwipeDirections[1].id))) as SwipeDirection,
        swipeRight: getSwipeDirection(JSON.parse(localStorage.getItem('swipeRight') || JSON.stringify(possibleSwipeDirections[2].id))) as SwipeDirection,
        nextArticleOnlyUnread: JSON.parse(localStorage.getItem('nextArticleOnlyUnread') || 'true') as boolean
    }),

    getters: {
        articles(state): StoredArticle[] {
            return state.articleIds
                .map(toStoredArticle)
                .filter((a): a is StoredArticle => a !== undefined)
                .sort((a, b) => {
                    return new Date(b.articleInfo.dateSaved!).getTime() - new Date(a.articleInfo.dateSaved!).getTime()
                })
        }
    },

    actions: {
        async update() {
            this.status = StoreStatus.LOADING

            try {
                const response = await axios.get('/readinglist')
                const readingList = response.data as Article[]

                const articlesStore = useArticlesStore()
                articlesStore.upsertMany(readingList)

                this.articleIds = readingList.map(a => a.id)

                await articlesStore.loadBatch(this.articleIds)
                for (const id of this.articleIds) {
                    if (articlesStore.content[id] === null) {
                        articlesStore.getContent(id, { force: true }).catch(error => {
                            console.debug(`Failed to load content for article ${id}`, error)
                        })
                    }
                }

                this.status = StoreStatus.READY
            } catch (error) {
                console.error(error)
                this.status = StoreStatus.ERROR
                return
            }

            this.persistIds()
        },
        addArticleLocal(article: Article) {
            const articlesStore = useArticlesStore()
            articlesStore.upsert(article)
            if (!this.articleIds.includes(article.id)) {
                this.articleIds.unshift(article.id)
            }
            this.persistIds()
        },
        removeArticleLocal(article: Article, undo = true) {
            const index = this.articleIds.indexOf(article.id)

            if (index !== -1) {
                this.articleIds.splice(index, 1)
            }

            if (undo) {
                this.removedArticles.push(article)
            }
            this.persistIds()
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
            await useArticlesStore().patch(article.id, input)
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
            try {
                const response = await axios.get('/settings')
                this.settings = response.data
                this.settingsStatus = StoreStatus.READY
            } catch (error) {
                console.error(error)
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
            try {
                await axios.delete('/readinglist', {
                    data: {
                        onlyRead
                    }
                })
                this.update()
            } catch (error) {
                console.error(error)
            }
        },
        getArticleById(id: string) {
            if (!this.articleIds.includes(id)) {
                return undefined
            }
            return toStoredArticle(id)
        },
        persistIds() {
            localStorage.setItem('readinglist', JSON.stringify(this.articleIds))
            const articlesStore = useArticlesStore()
            articlesStore.setProtectedIds('readingList', [...this.articleIds])
            articlesStore.schedulePersist()
        },
        setSwipeLeft(id: string) {
            this.swipeLeft = getSwipeDirection(id)
            localStorage.setItem('swipeLeft', JSON.stringify(id))
        },
        setSwipeRight(id: string) {
            this.swipeRight = getSwipeDirection(id)
            localStorage.setItem('swipeRight', JSON.stringify(id))
        },
        setNextArticleOnlyUnread(skip: boolean) {
            this.nextArticleOnlyUnread = skip
            localStorage.setItem('nextArticleOnlyUnread', JSON.stringify(skip))
        }
    }
})
