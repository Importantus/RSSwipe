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

export interface ColorScheme {
    id: string;
    name: string;
    foreground: string;
    background: string;
}

type ColorSchemeObject = {
    [key in ColorScheme["id"]]: ColorScheme;
}

export interface Font {
    id: string;
    name: string;
    font: string;
}

type FontObject = {
    [key in Font["id"]]: Font;
}

export interface FontSize {
    id: string;
    name: string;
}

type FontSizeObject = {
    [key in FontSize["id"]]: FontSize;
}

export const colorSchemes: ColorSchemeObject = {
    light: {
        id: "light",
        name: "Light",
        foreground: "black",
        background: "white"
    },
    dark: {
        id: "dark",
        name: "Dark",
        foreground: "white",
        background: "black"
    },
    sepia: {
        id: "sepia",
        name: "Sepia",
        foreground: "black",
        background: "#f4ecd8"
    }
}

export const fonts: FontObject = {
    sans: {
        id: "sans",
        name: "Sans",
        font: "Merriweather Sans, sans-serif"
    },
    serif: {
        id: "serif",
        name: "Serif",
        font: "Merriweather, serif"
    }
}

export const fontSizes: FontSizeObject = {
    small: {
        id: "small",
        name: "Small"
    },
    medium: {
        id: "medium",
        name: "Medium"
    },
    large: {
        id: "large",
        name: "Large"
    }
}

interface Settings {
    colorScheme: ColorScheme;
    font: Font;
    fontSize: FontSize;
}

const defaultSettings: Settings = {
    colorScheme: colorSchemes.dark,
    font: fonts.sans,
    fontSize: fontSizes.medium
}

function loadSettings(): Settings {
    const savedSettings = JSON.parse(localStorage.getItem("readerSettings") || JSON.stringify(defaultSettings)) as Settings;

    const loadedSettings: Settings = {
        ...defaultSettings,
        ...savedSettings
    }

    return loadedSettings;
}

export const useReaderStore = defineStore({
    id: 'reader',
    state: () => ({
        storedArticles: [] as StoredArticle[],
        status: ReaderStatus.LOADING,
        ReaderContext: ReaderContext.STARTPAGE,
        CurrentContent: "",
        startIndex: 0,
        settings: loadSettings()
    }),
    actions: {
        async openArticle(readerContext: ReaderContext, article: Article) {
            this.status = ReaderStatus.LOADING
            this.storedArticles = []
            switch (readerContext) {
                case ReaderContext.STARTPAGE:
                    this.ReaderContext = ReaderContext.STARTPAGE
                    this.getArticleContent(article)
                    this.storedArticles.push({
                        articleInfo: article
                    })
                    this.markArticleAsRead(article)
                    router.push(`/article/${article.id}`)
                    this.status = ReaderStatus.READY
                    break;
                case ReaderContext.READINGLIST:
                    this.ReaderContext = ReaderContext.READINGLIST
                    const readingListStore = useReadingListStore();
                    this.startIndex = readingListStore.articles.findIndex(a => a.articleInfo.id === article.id)
                    this.storedArticles = readingListStore.articles.slice(this.startIndex, this.startIndex + 1)
                    this.markArticleAsRead(article)
                    if (readingListStore.nextArticleSkipRead) {
                        this.getNextUnreadArticle()
                    } else {
                        this.getNextArticle()
                    }
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
                    this.getArticleContent(article)
                    this.storedArticles.push({
                        articleInfo: article
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
            this.storedArticles.shift()
            this.markArticleAsRead(this.storedArticles[0].articleInfo)
            const readingListStore = useReadingListStore();
            this.startIndex = readingListStore.articles.findIndex(a => a.articleInfo.id === this.storedArticles[0].articleInfo.id)
            if (readingListStore.nextArticleSkipRead) {
                this.getNextUnreadArticle()
            } else {
                this.getNextArticle()
            }
            router.push(`/article/${this.storedArticles[0].articleInfo.id}`)
        },

        async getNextUnreadArticle() {
            const readingListStore = useReadingListStore();
            const remainingArticles = readingListStore.articles.slice(this.startIndex + 1, readingListStore.articles.length)
            let unreadArticles = remainingArticles.filter(a => !a.articleInfo.read)
            if (unreadArticles.length > 0) {
                //Unread Articles below the current one
                this.storedArticles.push(unreadArticles[0])
            } else {
                //Any Unread Articles above or below the current one
                unreadArticles = readingListStore.articles.filter(a => !a.articleInfo.read)
                if (unreadArticles.length > 0) {
                    this.storedArticles.push(unreadArticles[0])
                }
            }
            return
        },

        async getNextArticle() {
            const readingListStore = useReadingListStore();
            const remainingArticles = readingListStore.articles.slice(this.startIndex + 1, readingListStore.articles.length)
            if (remainingArticles.length > 0) {
                //Unread Articles below the current one
                this.storedArticles.push(remainingArticles[0])
            }
            return
        },

        async getArticleContent(article: Article) {
            const response = await axios.get(`/articles/${article.id}/content`)

            if (response.status === 200) {
                const storedArticle = this.storedArticles.find(a => a.articleInfo.id === article.id)
                if (storedArticle) {
                    storedArticle.content = response.data
                }
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
        },
        async setColor(id: string) {
            this.settings.colorScheme = colorSchemes[id]
            localStorage.setItem("readerSettings", JSON.stringify(this.settings))
        },
        async setFont(id: string) {
            this.settings.font = fonts[id]
            localStorage.setItem("readerSettings", JSON.stringify(this.settings))
        },
        async setFontSize(id: string) {
            this.settings.fontSize = fontSizes[id]
            localStorage.setItem("readerSettings", JSON.stringify(this.settings))
        }
    }
})