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
        lastRemovedArticleId: ''
    }),
    actions: {
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
                        const content = await this.getArticleContent(article)

                        // Add articles to beginning of array
                        this.articles.unshift({
                            articleInfo: article,
                            content
                        })
                    }
                }

                this.status = StoreStatus.READY

                localStorage.setItem('readinglist', JSON.stringify(this.articles))
            } else {
                console.log(response)
                this.status = StoreStatus.ERROR
            }
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
            const response = await axios.delete(`/readinglist/articles`, {
                data: {
                    id: article.id
                }
            })

            if (response.status === 200) {
                const index = this.articles.findIndex(a => a.articleInfo.id === article.id)

                if (index !== -1) {
                    this.articles.splice(index, 1)
                }

                this.lastRemovedArticleId = article.id

                localStorage.setItem('readinglist', JSON.stringify(this.articles))
            } else {
                console.log(response)
            }
        },
        async undo() {
            if (!this.lastRemovedArticleId) {
                return
            }
            const response = await axios.post(`/readinglist/articles`, {
                id: this.lastRemovedArticleId
            })

            if (response.status === 200) {
                this.update()
            } else {
                console.log(response)
            }
        }
    }
})