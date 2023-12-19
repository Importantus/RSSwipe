import { defineStore } from "pinia"; ""
import axios from "@/axios";
import router from "@/router";
import { useReadingListStore } from '@/stores/readingList';
import type { Article, StoredArticle } from "@/types";

export enum ReaderStatus {
    LOADING,
    READY,
    ERROR
}

export enum ReaderContext {
    STARTPAGE,
    READINGLIST
}

//TODO: Make global article functions

export const useReaderStore = defineStore({
    id: 'reader',
    state: () => ({
        storedArticles: [] as StoredArticle[],
        status: ReaderStatus.LOADING,
        ReaderContext: ReaderContext.STARTPAGE,
        CurrentContent: "",
        startIndex: 0
    }),


    actions: {
        async openArticle(readerContext: ReaderContext, article: Article) {
            this.status = ReaderStatus.LOADING
            this.storedArticles = []
            switch (readerContext) {
                case ReaderContext.STARTPAGE:
                    this.ReaderContext = ReaderContext.STARTPAGE
                    const content = await this.getArticleContent(article)
                    this.storedArticles.push({
                        articleInfo: article,
                        content: content
                    })
                    this.markArticleAsRead(article)
                    router.push(`/article/${article.id}`)
                    this.status = ReaderStatus.READY
                    break;
                case ReaderContext.READINGLIST:
                    this.ReaderContext = ReaderContext.READINGLIST
                    const readingListStore = useReadingListStore();
                    this.startIndex = readingListStore.articles.findIndex(a => a.articleInfo.id === article.id)
                    this.storedArticles = readingListStore.articles.slice(this.startIndex, this.startIndex + 2)
                    this.markArticleAsRead(article)
                    router.push(`/article/${article.id}`)
                    this.status = ReaderStatus.READY
                    break;
            }
        },

        async openArticleFromId(id: string) {
            this.status = ReaderStatus.LOADING
            this.storedArticles = []
            this.ReaderContext = ReaderContext.STARTPAGE

            if (id.length !== 36) {
                this.status = ReaderStatus.ERROR
                console.log("Invalid article id: " + id + " found!")
                router.push("/404")
                return
            }

            try {
                const article = await this.getArticleInfo(id)
                if (article) {
                    const content = await this.getArticleContent(article)
                    this.storedArticles.push({
                        articleInfo: article,
                        content: content
                    })
                    this.markArticleAsRead(article)
                    this.status = ReaderStatus.READY
                    return
                }
            }
            catch (error) {
                this.status = ReaderStatus.ERROR
                console.log("No article with id: " + id + " found!")
                router.push("/404")
            }

        }
        ,

        async nextArticle() {
            const readingListStore = useReadingListStore();
            this.startIndex = this.startIndex + 1
            this.storedArticles = readingListStore.articles.slice(this.startIndex, this.startIndex + 2)
            console.log(this.storedArticles)
            router.push(`/article/${this.storedArticles[0].articleInfo.id}`)
        },

        async getArticleContent(article: Article) {
            const response = await axios.get(`/articles/${article.id}/content`)

            if (response.status === 200) {
                return response.data
            } else {
                console.error(response)
            }
        },

        async getArticleInfo(id: string) {
            const response = await axios.get(`/articles/${id}`)
            if (response.status === 200) {
                return response.data as Article
            } else {
                console.error(response)
            }

        },

        async markArticleAsRead(article: Article) {
            const request = { "read": true }
            const response = await axios.put(`/articles/${article.id}`, request)
            if (response.status === 200) {
                return response.data as Article
            } else {
                console.error(response)
            }
        }
    }
})