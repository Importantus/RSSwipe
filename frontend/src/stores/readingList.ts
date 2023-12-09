import axios from "@/axios";
import type { Article, StoredArticle } from "@/types";
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
        removedArticles: [] as Article[]
    }),
    actions: {
        addArticle(article: Article) {
            this.addContentToArticle(article)

            this.articles.unshift({
                articleInfo: article
            })
        },
        async update() {
            this.status = StoreStatus.LOADING

            const response = await axios.get('/readinglist', {
                params: {
                    limit: 50
                }
            })

            if (response.status === 200) {
                const readingList = response.data as Article[]
                for (const article of readingList) {
                    const index = this.articles.findIndex(a => a.articleInfo.id === article.id)
                    if (index === -1) {
                        this.addArticle(article)
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

            if (index === -1) {
                return
            }

            const content = await this.getArticleContent(article)

            this.articles[index].content = content

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


            const index = this.articles.findIndex(a => a.articleInfo.id === article.id)

            if (index !== -1) {
                this.articles.splice(index, 1)
            }

            this.removedArticles.push(article)

            localStorage.setItem('readinglist', JSON.stringify(this.articles))
        },
        async undo() {
            if (this.removedArticles.length === 0) {
                return
            }

            const lastRemovedArticle = this.removedArticles.pop()

            this.addArticle(lastRemovedArticle!)

            axios.post(`/readinglist/articles`, {
                id: lastRemovedArticle!.id
            })
        }
    }
})