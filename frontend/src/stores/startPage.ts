
import axios from "@/axios";
import { defineStore } from "pinia";

export enum ArticleStatus {
    LOADING,
    READY,
    ERROR,
    OUT_OF_ARTICLES
}

export const useStartPageStore = defineStore({
    id: 'startPage',
    state: () => ({
        articles: [] as Article[],
        status: ArticleStatus.LOADING
    }),
    actions: {
        async fetchArticles() {
            if (this.articles.length > 5) {
                this.status = ArticleStatus.READY
                return
            }

            this.status = ArticleStatus.LOADING

            const response = await axios.get('/articles', {
                // TODO: set selected feeds
                params: {
                    limit: 5
                }
            })

            if (response.status === 200) {
                console.log(response.data)
                for (const article of response.data) {
                    if (!this.articles.find(a => a.id === article.id)) {
                        this.articles.push(article)
                    }
                }
            } else {
                console.log(response)
            }

            if (this.articles.length < 3) {
                this.status = ArticleStatus.OUT_OF_ARTICLES
            } else {
                this.status = ArticleStatus.READY
            }
        },
        async _updateArticle(params: Partial<Article>) {
            const article = this.articles[0]
            const response = await axios.put(`/articles/${article.id}`, params)

            if (response.status === 200) {
                this.articles.shift()
                this.fetchArticles()
            } else {
                console.log(response)
            }
        },
        async saveArticle() {
            this._updateArticle({
                saved: true,
                seen: true
            })            // TODO update readinglist
        },
        async discardArticle() {
            this._updateArticle({
                seen: true
            })
        }
    }
})