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
            const store = useStarredListStore()
            store.updateArticle(article, {
                read: !article.read
            })
        }
    },
    {
        id: 'starred',
        name: 'unstar',
        color: 'orange',
        removeCard: true,
        icon: Star,
        action: (article: Article) => {
            const store = useStarredListStore()
            store.unstarArticle(article)
        }
    },
    {
        id: 'remove',
        name: 'Remove',
        color: 'red',
        removeCard: true,
        icon: Trash2,
        action: (article: Article) => {
            const store = useStarredListStore()
            store.removeArticle(article)
        }
    }
]

function getSwipeDirection(id: string) {
    return possibleSwipeDirections.find(d => d.id === id)!
}

export const useStarredListStore = defineStore({
    id: 'starred',
    state: () => ({
        articleIds: loadPersistedListIds('starred'),
        status: StoreStatus.LOADING,
        settingsStatus: StoreStatus.LOADING,
        removedArticles: [] as Article[],
        unstarredArticles: [] as Article[],
        settings: {} as Settings,
        swipeLeft: getSwipeDirection(JSON.parse(localStorage.getItem('swipeLeft') || JSON.stringify(possibleSwipeDirections[1].id))) as SwipeDirection,
        swipeRight: getSwipeDirection(JSON.parse(localStorage.getItem('swipeRight') || JSON.stringify(possibleSwipeDirections[2].id))) as SwipeDirection
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
        unstarArticleLocal(article: Article, undo = true) {
            const index = this.articleIds.indexOf(article.id)

            if (index !== -1) {
                this.articleIds.splice(index, 1)
            }

            if (undo) {
                this.unstarredArticles.push(article)
            }
            this.persistIds()
        },
        async update() {
            this.status = StoreStatus.LOADING

            try {
                const response = await axios.get('/starred')
                const starredList = response.data as Article[]

                const articlesStore = useArticlesStore()
                articlesStore.upsertMany(starredList)

                this.articleIds = starredList.map(a => a.id)

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
        async removeArticle(article: Article) {
            axios.delete(`/readinglist/articles`, {
                data: {
                    id: article.id
                }
            })
            axios.delete(`/starred/articles`, {
                data: {
                    id: article.id
                }
            })
            this.removeArticleLocal(article)
        },
        async unstarArticle(article: Article) {
            axios.delete(`/starred/articles`, {
                data: {
                    id: article.id
                }
            })
            this.unstarArticleLocal(article)
        },
        async updateArticle(article: Article, input: ArticleUpdateInput) {
            await useArticlesStore().patch(article.id, input)
        },
        async undoRemove() {
            if (this.removedArticles.length === 0) {
                return
            }

            const lastRemovedArticle = this.removedArticles.pop()

            this.addArticleLocal(lastRemovedArticle!)

            axios.post(`/readinglist/articles`, {
                id: lastRemovedArticle!.id
            })
            axios.post(`/starred/articles`, {
                id: lastRemovedArticle!.id
            })
        },
        async undoUnstarred() {
            if (this.unstarredArticles.length === 0) {
                return
            }

            const lastUnstarredArticle = this.unstarredArticles.pop()

            this.addArticleLocal(lastUnstarredArticle!)

            axios.post(`/starred/articles`, {
                id: lastUnstarredArticle!.id
            })
        },
        persistIds() {
            localStorage.setItem('starred', JSON.stringify(this.articleIds))
            const articlesStore = useArticlesStore()
            articlesStore.setProtectedIds('starredList', [...this.articleIds])
            articlesStore.schedulePersist()
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
        setSwipeLeft(id: string) {
            this.swipeLeft = getSwipeDirection(id)
            localStorage.setItem('swipeLeft', JSON.stringify(id))
        },
        setSwipeRight(id: string) {
            this.swipeRight = getSwipeDirection(id)
            localStorage.setItem('swipeRight', JSON.stringify(id))
        }
    }
})
