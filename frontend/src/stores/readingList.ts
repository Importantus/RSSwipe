import axios from "@/axios";
import type { Article, Settings, StoredArticle } from "@/types";
import { defineStore } from "pinia";

export enum StoreStatus {
    LOADING,
    READY,
    ERROR
}

export const useReadingListStore = defineStore({
    id: 'readingList',
    state: () => ({
        articles: JSON.parse(localStorage.getItem('readinglist') || '[]') as StoredArticle[],
        status: StoreStatus.LOADING,
        removedArticles: [] as Article[],
        settings: {} as Settings
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
            const response = await axios.get('/settings')

            if (response.status === 200) {
                this.settings = response.data
            } else {
                console.log(response)
            }
        },
        async updateSettings(settings: Settings) {
            const response = await axios.put('/settings', settings)

            if (response.status === 200) {
                this.settings = response.data
            } else {
                console.log(response)
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
        }
    }
})