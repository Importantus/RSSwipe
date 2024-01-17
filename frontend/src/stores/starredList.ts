import axios from "@/axios";
import type { Article, Settings, StoredArticle, SwipeDirection } from "@/types";
import { defineStore } from "pinia";
import { Trash2 } from 'lucide-vue-next';
import { Star } from 'lucide-vue-next';
import { BookOpenCheck } from "lucide-vue-next";

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
        articles: JSON.parse(localStorage.getItem('starred') || '[]') as StoredArticle[],
        status: StoreStatus.LOADING,
        settingsStatus: StoreStatus.LOADING,
        removedArticles: [] as Article[],
        unstarredArticles: [] as Article[],
        settings: {} as Settings,
        swipeLeft: getSwipeDirection(JSON.parse(localStorage.getItem('swipeLeft') || JSON.stringify(possibleSwipeDirections[1].id))) as SwipeDirection,
        swipeRight: getSwipeDirection(JSON.parse(localStorage.getItem('swipeRight') || JSON.stringify(possibleSwipeDirections[2].id))) as SwipeDirection
    }),
    actions: {
        addArticleLocal(article: Article) {
            if (this.articles.findIndex(a => a.articleInfo.id === article.id) === -1) {
                this.articles.unshift({
                    articleInfo: article
                })
            }

            this.addContentToArticle(article)
        },
        removeArticleLocal(article: Article, undo = true) {
            const index = this.articles.findIndex(a => a.articleInfo.id === article.id)

            if (index !== -1) {
                this.articles.splice(index, 1)
            }

            if (undo) {
                this.removedArticles.push(article)
            }
            localStorage.setItem('starred', JSON.stringify(this.articles))
        },
        unstarArticleLocal(article: Article, undo = true) {
            const index = this.articles.findIndex(a => a.articleInfo.id === article.id)

            if (index !== -1) {
                this.articles.splice(index, 1)
            }

            if (undo) {
                this.unstarredArticles.push(article)
                console.log(this.unstarredArticles)
            }
            localStorage.setItem('starred', JSON.stringify(this.articles))
        },
        async update() {
            this.status = StoreStatus.LOADING

            const response = await axios.get('/starred')

            if (response.status === 200) {
                const starredList = response.data as Article[]
                for (const article of starredList) {
                    this.addArticleLocal(article)

                    this.articles[this.articles.findIndex(a => a.articleInfo.id === article.id)].articleInfo = article
                }

                for (const article of [...this.articles]) {
                    const index = starredList.findIndex(a => a.id === article.articleInfo.id)
                    if (index === -1) {
                        this.removeArticleLocal(article.articleInfo, false)
                    }
                }

                this.articles.sort((a, b) => {
                    return new Date(b.articleInfo.dateSaved!).getTime() - new Date(a.articleInfo.dateSaved!).getTime()
                })

                this.status = StoreStatus.READY

                localStorage.setItem('starred', JSON.stringify(this.articles))
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

            localStorage.setItem('starred', JSON.stringify(this.articles))
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
            const response = await axios.put(`/articles/` + article.id, {
                ...input
            })

            if (response.status === 200) {
                this.articles[this.articles.findIndex(a => a.articleInfo.id === article.id)].articleInfo = response.data
                localStorage.setItem('starred', JSON.stringify(this.articles))
            } else {
                console.log(response)
            }
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