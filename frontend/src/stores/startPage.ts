
import axios from "@/axios";
import type { Article } from "@/types";
import { defineStore } from "pinia";
import { useReadingListStore } from "./readingList";
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
    active: boolean
}

export interface DateFrame {
    maxStart: number
    start: number
    end: number
}

export const useStartPageStore = defineStore({
    id: 'startPage',
    state: () => ({
        articles: [] as Article[],
        status: ArticleStatus.LOADING,
        swipeLimit: JSON.parse(localStorage.getItem('swipeLimit') ?? JSON.stringify({
            swipes: 0,
            lastSwiped: new Date(),
            swipeLimit: 10,
            active: false
        })) as SwipeLimit,
        lastActions: [] as Article[],
        swipeLeftPercentage: 0,
        swipeRightPercentage: 0,
        dateFrame: JSON.parse(localStorage.getItem('dateFrame') ?? JSON.stringify({
            maxStart: 0,
            start: -1000,
            end: 0
        })) as DateFrame
    }),
    actions: {
        // Load Articles
        async reload() {
            this.articles = []
            await this.fetchArticles()
        },
        async fetchArticles() {
            if (this.articles.length >= STORED_ARTICLES) {
                this.status = ArticleStatus.READY
                return
            }

            this.status = ArticleStatus.LOADING

            const categoriesStore = useCategoriesStore()
            const feedsStore = useFeedStore()
            console.log(this.getStartDate(), this.getEndDate())
            const response = await axios.get('/articles', {
                params: {
                    limit: STORED_ARTICLES + this.articles.length,
                    categories: categoriesStore.selectedCategories.map(c => c.id),
                    feeds: feedsStore.filteredFeedList.map(f => f.id),
                    startDate: this.toISO8601(this.getStartDate()),
                    endDate: this.toISO8601(this.getEndDate())
                }
            })

            if (response.status === 200) {
                for (const article of response.data) {
                    if (!this.articles.find(a => a.id === article.id) && !this.lastActions.find(a => a.id === article.id)) {
                        this.articles.push(article)
                    }
                }
            } else {
                console.log(response)
            }

            if (this.articles.length < 1) {
                this.status = ArticleStatus.OUT_OF_ARTICLES
            } else {
                this.status = ArticleStatus.READY
            }
        },
        async _updateArticle(params: Partial<Article>) {
            const article = this.articles[0]
            if (params.seen) {
                this.articles.shift()
            }
            await axios.put(`/articles/${article.id}`, params)
            this.fetchArticles()
        },

        // Digital Wellbeing: Swipe Limit
        addSwipe() {
            if (new Date(this.swipeLimit.lastSwiped).getDate() !== new Date().getDate()) {
                this.swipeLimit.swipes = 0
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
            this.lastActions.unshift(this.articles[0])

            if (this.lastActions.length > 5) {
                this.lastActions.pop()
            }
        },
        revertAction() {
            this.removeSwipe()

            if (this.lastActions.length === 0) {
                return
            }

            this.articles.unshift(this.lastActions.shift()!)
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