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
        },

        async openArticleExternal(article: Article) {
            window.open(article.link, '_blank')!.focus();
        },

        async shareArticle(article: Article) {
            navigator
                .share({
                    title: article.title,
                    text: article.title,
                    url: article.link,
                })
                .then(() => console.log('Successful share! 🎉'))
                .catch(err => console.error(err));
        },

        async setArticleStarred(article: Article, starred: boolean) {
            const request = { "id": article.id }
            if (starred) {
                console.log("Starring:" + article.id)
                const response = await axios.post(`/starred/articles`, request)
                if (response.status === 200) {
                    return response.data as Article
                } else {
                    console.error(response)
                }
            } else {
                console.log("Unstarring:" + article.id)
                const response = await axios.delete(`/starred/articles`, { data: request })
                if (response.status === 200) {
                    return response.data as Article
                } else {
                    console.error(response)
                }
            }

        },

        async getStarStatus(article: Article) {
            const response = await axios.get(`/starred`)
            if (response.status === 200) {
                const data: Article[] = response.data
                const starred: Article | undefined = data.find(a => a.id === article.id)
                if (starred) {
                    return true;
                } else {
                    return false;
                }
            } else {
                console.error(response)
            }
            return null;
        }
    }
})