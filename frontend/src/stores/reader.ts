import { defineStore } from "pinia";
import axios from "@/axios";
import { useReadingListStore } from '@/stores/readingList';
import { useStarredListStore } from '@/stores/starredList';
import { toStoredArticle, useArticlesStore } from '@/stores/articles';
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
        storedArticleIds: [] as string[],
        status: ReaderStatus.LOADING,
        openInApp: true,
        settings: loadSettings()
    }),
    getters: {
        storedArticles(state): StoredArticle[] {
            return state.storedArticleIds
                .map(toStoredArticle)
                .filter((a): a is StoredArticle => a !== undefined)
        }
    },
    actions: {
        async openArticle(articleId: string, list: 'reading' | 'starred' | 'none') {
            this.status = ReaderStatus.LOADING
            this.storedArticleIds = []
            this.openInApp = true
            const article = await this.getArticle(articleId)
            if (this.openInApp) {
                useArticlesStore().getContent(article.id, { force: true }).catch(error => {
                    console.debug(`Failed to load content for article ${article.id}`, error)
                })
            }
            this.storedArticleIds.push(article.id)
            this.registerProtectedIds()
            this.markArticleAsRead(article.id)
            const readingListStore = useReadingListStore();
            if (readingListStore.nextArticleOnlyUnread) {
                this.getNextUnreadArticle(list)
            } else {
                this.getNextArticle(list)
            }
            this.status = ReaderStatus.READY
        },
        registerProtectedIds() {
            useArticlesStore().setProtectedIds('reader', [...this.storedArticleIds])
        },
        async getNextUnreadArticle(list: 'reading' | 'starred' | 'none') {
            const listStore = list === 'reading' ? useReadingListStore() : useStarredListStore();
            const startIndex = listStore.articles.findIndex(a => a.articleInfo.id === this.storedArticleIds[0])
            if (startIndex === -1) {
                return
            }
            const remainingArticles = listStore.articles.slice(startIndex + 1, listStore.articles.length)
            let unreadArticles = remainingArticles.filter(a => !a.articleInfo.read)
            if (unreadArticles.length > 0) {
                //Unread Articles below the current one
                this.storedArticleIds.push(unreadArticles[0].articleInfo.id)
                this.registerProtectedIds()
            } else {
                //Any Unread Articles above or below the current one
                unreadArticles = listStore.articles.filter(a => !a.articleInfo.read && a.articleInfo.id !== this.storedArticleIds[0])
                if (unreadArticles.length > 0) {
                    this.storedArticleIds.push(unreadArticles[0].articleInfo.id)
                    this.registerProtectedIds()
                }
            }
        },

        async getNextArticle(list: 'reading' | 'starred' | 'none') {
            const listStore = list === 'reading' ? useReadingListStore() : useStarredListStore();
            const startIndex = listStore.articles.findIndex(a => a.articleInfo.id === this.storedArticleIds[0])
            if (startIndex === -1) {
                return
            }
            const remainingArticles = listStore.articles.slice(startIndex + 1, listStore.articles.length)
            if (remainingArticles.length > 0) {
                //Unread Articles below the current one
                this.storedArticleIds.push(remainingArticles[0].articleInfo.id)
                this.registerProtectedIds()
            }
        },

        async getArticle(id: string): Promise<Article> {
            const articlesStore = useArticlesStore()
            let article = articlesStore.get(id)
            if (!article) {
                article = await articlesStore.ensure(id)
            }
            this.openInApp = await useFeedStore().isFeedOpenedInApp(article.feed.id)
            return article
        },

        async markArticleAsRead(id: string) {
            const readinglistStore = useReadingListStore()
            const storedArticle = readinglistStore.getArticleById(id)
            try {
                if (storedArticle) {
                    await readinglistStore.updateArticle(storedArticle.articleInfo, {
                        read: true
                    })
                } else {
                    await useArticlesStore().patch(id, { read: true })
                }
            } catch (error) {
                console.error(error)
            }
        },

        async openArticleExternal(article: Article) {
            window.open(article.link, '_blank')!.focus();
        },

        async shareArticle(article: Article) {
            navigator
                .share({
                    title: article.title,
                    text: `${article.title}\n\nRead directly in RSSwipe:\n${window.location.origin}/article/${article.id}\n\nOr on the original website:\n${article.link}`,
                })
                .then(() => console.log('Successful share! 🎉'))
                .catch(err => console.error(err));
        },

        async setArticleStarred(article: Article, starred: boolean) {
            const articlesStore = useArticlesStore()
            articlesStore.patchLocal(article.id, { starred })
            const request = { "id": article.id }
            try {
                if (starred) {
                    await axios.post(`/starred/articles`, request)
                } else {
                    await axios.delete(`/starred/articles`, { data: request })
                }
            } catch (error) {
                articlesStore.patchLocal(article.id, { starred: !starred })
                console.error(error)
            }
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
