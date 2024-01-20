import { defineStore } from "pinia";
import axios from "@/axios";
import { useReadingListStore } from '@/stores/readingList';
import { useStarredListStore } from '@/stores/starredList';
import type { Article, StoredArticle } from "@/types";
import { useFeedStore } from "./feeds";

export enum ReaderStatus {
    LOADING,
    READY,
    ERROR
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
        openInApp: true,
        settings: loadSettings()
    }),
    actions: {
        async openArticle(articleId: string, list: 'reading' | 'starred' | 'none') {
            this.status = ReaderStatus.LOADING
            this.storedArticles = []
            this.openInApp = true
            const article = await this.getArticle(articleId)
            this.storedArticles.push(article)
            this.markArticleAsRead(article.articleInfo.id)
            const readingListStore = useReadingListStore();
            if (readingListStore.nextArticleSkipRead) {
                this.getNextUnreadArticle(list)
            } else {
                this.getNextArticle(list)
            }
            this.status = ReaderStatus.READY
        },
        async getNextUnreadArticle(list: 'reading' | 'starred' | 'none') {
            const listStore = list === 'reading' ? useReadingListStore() : useStarredListStore();
            const startIndex = listStore.articles.findIndex(a => a.articleInfo.id === this.storedArticles[0].articleInfo.id)
            if (startIndex === -1) {
                return
            }
            const remainingArticles = listStore.articles.slice(startIndex + 1, listStore.articles.length)
            let unreadArticles = remainingArticles.filter(a => !a.articleInfo.read)
            if (unreadArticles.length > 0) {
                //Unread Articles below the current one
                this.storedArticles.push(unreadArticles[0])
            } else {
                //Any Unread Articles above or below the current one
                unreadArticles = listStore.articles.filter(a => !a.articleInfo.read && a.articleInfo.id !== this.storedArticles[0].articleInfo.id)
                if (unreadArticles.length > 0) {
                    this.storedArticles.push(unreadArticles[0])
                }
            }
        },

        async getNextArticle(list: 'reading' | 'starred' | 'none') {
            const listStore = list === 'reading' ? useReadingListStore() : useStarredListStore();
            const startIndex = listStore.articles.findIndex(a => a.articleInfo.id === this.storedArticles[0].articleInfo.id)
            const remainingArticles = listStore.articles.slice(startIndex + 1, listStore.articles.length)
            if (startIndex === -1) {
                return
            }
            if (remainingArticles.length > 0) {
                //Unread Articles below the current one
                this.storedArticles.push(remainingArticles[0])
            }
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

        async getArticle(id: string) {
            const readingListStore = useReadingListStore();
            let article = readingListStore.getArticleById(id)
            const feedStore = useFeedStore();
            if (!article) {
                let articleInfo
                const response = await axios.get(`/articles/${id}`)
                if (response.status === 200) {
                    articleInfo = response.data
                } else {
                    console.error(response)
                }
                article = {
                    articleInfo: articleInfo as Article
                }
                if (await feedStore.isFeedOpenedInApp(article.articleInfo.feed.id)) {
                    this.getArticleContent(article.articleInfo)
                }
            }
            this.openInApp = await feedStore.isFeedOpenedInApp(article.articleInfo.feed.id)
            return article
        },

        async markArticleAsRead(id: string) {
            const readinglistStore = useReadingListStore()
            const article = readinglistStore.getArticleById(id)
            if (article) {
                readinglistStore.updateArticle(article.articleInfo, {
                    read: true
                })
            } else {
                const request = { "read": true }
                const response = await axios.put(`/articles/${id}`, request)
                if (response.status === 200) {
                    return response.data as Article
                } else {
                    console.error(response)
                }
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
            if (article.id === this.storedArticles[0].articleInfo.id) {
                this.storedArticles[0].articleInfo.starred = starred
            }
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
            return article.starred
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