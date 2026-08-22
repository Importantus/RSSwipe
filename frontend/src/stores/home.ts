import axios from "@/axios";
import type { Article } from "@/types";
import { defineStore } from "pinia";
import { useReadingListStore } from "./readingList";
import { useArticlesStore } from "./articles";
import { useCategoriesStore } from "./categories";
import { useFeedStore } from "./feeds";

const STORED_ARTICLES = 5

export enum ArticleStatus {
    LOADING,
    READY,
    ERROR,
    OUT_OF_ARTICLES
}

export interface SwipeLimit {
    swipes: number
    lastSwiped: Date
    swipeLimit: number
    overSwipes: number
    active: boolean
}

export interface DateFrame {
    maxStart: number
    start: number
    end: number
}

export const useHomeStore = defineStore({
    id: 'home',
    state: () => ({
        articleIds: [] as string[],
        status: ArticleStatus.LOADING,
        swipeLimit: JSON.parse(localStorage.getItem('swipeLimit') ?? JSON.stringify({
            swipes: 0,
            lastSwiped: new Date(),
            swipeLimit: 10,
            overSwipes: 0,
            active: false
        })) as SwipeLimit,
        lastActionIds: [] as string[],
        swipeLeftPercentage: 0,
        swipeRightPercentage: 0,
        dateFrame: JSON.parse(localStorage.getItem('dateFrame') ?? JSON.stringify({
            maxStart: 0,
            start: -1000,
            end: 0
        })) as DateFrame
    }),

    getters: {
        articles(state): Article[] {
            const articlesStore = useArticlesStore()
            return state.articleIds.map(id => articlesStore.articles[id]).filter((a): a is Article => a !== undefined)
        },
        lastActions(state): Article[] {
            const articlesStore = useArticlesStore()
            return state.lastActionIds.map(id => articlesStore.articles[id]).filter((a): a is Article => a !== undefined)
        }
    },

    actions: {
        // Load Articles
        async reload() {
            this.articleIds = []
            await this.fetchArticles()
        },
        async fetchArticles() {
            if (new Date(this.swipeLimit.lastSwiped).getDate() !== new Date().getDate()) {
                this.resetSwipeLimit()
            }
            if (this.articleIds.length >= STORED_ARTICLES) {
                this.status = ArticleStatus.READY
                this.prefetchWindow()
                return
            }
            this.status = ArticleStatus.LOADING
            const categoriesStore = useCategoriesStore()
            const feedsStore = useFeedStore()
            const response = await axios.get('/articles', {
                params: {
                    limit: STORED_ARTICLES + this.articleIds.length,
                    categories: categoriesStore.selectedCategories.map(c => c.id),
                    feeds: feedsStore.filteredFeedList.map(f => f.id),
                    startDate: this.toISO8601(this.getStartDate()),
                    endDate: this.toISO8601(this.getEndDate())
                }
            })
            const articlesStore = useArticlesStore()
            articlesStore.upsertMany(response.data)
            const known = new Set<string>([...this.articleIds, ...this.lastActionIds])
            for (const article of response.data) {
                if (!known.has(article.id)) {
                    known.add(article.id)
                    this.articleIds.push(article.id)
                }
            }
            if (this.articleIds.length < 1) {
                this.status = ArticleStatus.OUT_OF_ARTICLES
            } else {
                this.status = ArticleStatus.READY
            }
            this.syncProtectedIds()
            this.prefetchWindow()
        },
        syncProtectedIds() {
            useArticlesStore().setProtectedIds('home', [...this.articleIds, ...this.lastActionIds])
        },
        prefetchWindow() {
            const articlesStore = useArticlesStore()
            if (!articlesStore.prefetchEnabled || this.articleIds.length === 0) {
                return
            }
            const feedsStore = useFeedStore()
            let candidateIds = this.articleIds.slice(0, STORED_ARTICLES)
            if (feedsStore.feedList.length > 0) {
                candidateIds = candidateIds.filter(id => {
                    const feed = feedsStore.feedList.find(f => f.id === articlesStore.articles[id]?.feed?.id)
                    return feed ? feed.openInApp : true
                })
            }
            articlesStore.prefetch(candidateIds)
        },
        async _updateArticle(params: Partial<Article>) {
            const articlesStore = useArticlesStore()
            const article = this.articles[0]
            if (!article) {
                return
            }
            if (params.seen) {
                this.articleIds.shift()
            }
            await articlesStore.patch(article.id, params)
            this.syncProtectedIds()
            articlesStore.prune()
            this.fetchArticles()
        },
        // Digital Wellbeing: Swipe Limit
        resetSwipeLimit() {
            this.swipeLimit.swipes = 0
            this.swipeLimit.overSwipes = 0
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        addSwipe() {
            if (new Date(this.swipeLimit.lastSwiped).getDate() !== new Date().getDate()) {
                this.swipeLimit.swipes = 0
                this.swipeLimit.overSwipes = 0
            }
            this.swipeLimit.swipes++
            this.swipeLimit.lastSwiped = new Date()
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        removeSwipe() {
            this.swipeLimit.swipes--
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        setSwipeLimit(swipeLimit: number) {
            this.swipeLimit.swipeLimit = swipeLimit
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        enableSwipeLimit() {
            this.swipeLimit.active = true
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        disableSwipeLimit() {
            this.swipeLimit.active = false
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        addOverSwipes() {
            if ((this.swipeLimit.swipes - (this.swipeLimit.swipeLimit + this.swipeLimit.overSwipes)) > 5) {
                this.swipeLimit.overSwipes = (this.swipeLimit.swipes + 5) - this.swipeLimit.swipeLimit
            } else {
                this.swipeLimit.overSwipes = this.swipeLimit.overSwipes + 5
            }
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        resetOverSwipes() {
            this.swipeLimit.overSwipes = 0
            localStorage.setItem('swipeLimit', JSON.stringify(this.swipeLimit))
        },
        updateSwipeLimit() {
            if (this.swipeLimit.swipes < this.swipeLimit.swipeLimit) {
                this.resetOverSwipes()
            }
        },
        // Swipe Actions
        async saveArticle() {
            this.saveAction()
            this.addSwipe()
            await this._updateArticle({
                saved: true,
                seen: true
            })
            const readinglist = useReadingListStore();
            readinglist.update()
        },
        async discardArticle() {
            this.saveAction()
            this.addSwipe()
            this._updateArticle({
                seen: true
            })
        },
        // Revert Actions
        saveAction() {
            const article = this.articles[0]
            if (!article) {
                return
            }
            this.lastActionIds.unshift(article.id)
            if (this.lastActionIds.length > 5) {
                this.lastActionIds.pop()
            }
            this.syncProtectedIds()
        },
        revertAction() {
            this.removeSwipe()
            if (this.lastActionIds.length === 0) {
                return
            }
            const revertedId = this.lastActionIds.shift()!
            if (!this.articleIds.includes(revertedId)) {
                this.articleIds.unshift(revertedId)
            }
            this.syncProtectedIds()
            this._updateArticle({
                saved: false,
                seen: false
            })
        },
        // Date Frame
        setStartDay(day: number) {
            this.dateFrame.start = day
            this.reload()
            localStorage.setItem('dateFrame', JSON.stringify(this.dateFrame))
        },
        setEndDay(day: number) {
            this.dateFrame.end = day
            this.reload()
            localStorage.setItem('dateFrame', JSON.stringify(this.dateFrame))
        },
        getStartDate() {
            const date = new Date()
            date.setDate(date.getDate() + +this.dateFrame.start)
            return date
        },
        getEndDate() {
            const date = new Date()
            // Add 1 day because the end date is exclusive
            date.setDate(date.getDate() + +this.dateFrame.end + 1)
            return date
        },
        getMaxStartDate() {
            const date = new Date()
            date.setDate(date.getDate() + this.dateFrame.maxStart)
            return date
        },
        toISO8601(date: Date) {
            return date.toISOString().split('T')[0]
        },
        async fetchMaxStartDate() {
            const response = await axios.get('/system')
            this.dateFrame.maxStart = -(response.data.maxArticleAge / 1000 / 60 / 60 / 24)
            if (this.dateFrame.start < this.dateFrame.maxStart) {
                this.dateFrame.start = this.dateFrame.maxStart
            }
            localStorage.setItem('dateFrame', JSON.stringify(this.dateFrame))
        }
    }
})
