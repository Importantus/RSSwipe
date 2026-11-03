import { defineStore } from 'pinia'
import axios from '@/axios'
import { apiErrorMessage } from '@/apiError'

export interface FeedCategory {
    id: string
    name: string
    /** Palette key, see components/categories/categoryColors.ts */
    color: string
    position: number
    createdAt: string
    feedIds: string[]
}

/** none: no feed of the category is in the set, partial: some, full: all, empty: the category has no feeds */
export type CategoryState = 'none' | 'partial' | 'full' | 'empty'

export interface CategoryInput {
    name: string
    color: string
    feedIds: string[]
}

export function categoryState(category: FeedCategory, ids: Iterable<string>): CategoryState {
    if (category.feedIds.length === 0) return 'empty'
    const set = ids instanceof Set ? ids : new Set(ids)
    const count = category.feedIds.filter(id => set.has(id)).length
    if (count === 0) return 'none'
    return count === category.feedIds.length ? 'full' : 'partial'
}

/** Taps on a category: everything selected -> deselect all of its feeds, otherwise select all of them. */
export function toggleCategoryIn(category: FeedCategory, ids: Iterable<string>): string[] {
    const set = new Set(ids)
    if (categoryState(category, set) === 'full') {
        category.feedIds.forEach(id => set.delete(id))
    } else {
        category.feedIds.forEach(id => set.add(id))
    }
    return [...set]
}

/**
 * One tap on a category chip moves it on: not selected -> selected -> hidden -> not selected.
 * Hiding a category also takes its feeds out of the selection, as hiding wins anyway.
 */
export function cycleCategoryIn(
    category: FeedCategory,
    ids: Iterable<string>,
    mutedIds: Iterable<string>
): { ids: string[]; muted: string[] } {
    const muted = new Set(mutedIds)
    if (muted.has(category.id)) {
        muted.delete(category.id)
        return { ids: [...ids], muted: [...muted] }
    }
    if (categoryState(category, ids) === 'full') {
        const set = new Set(ids)
        category.feedIds.forEach(id => set.delete(id))
        muted.add(category.id)
        return { ids: [...set], muted: [...muted] }
    }
    return { ids: toggleCategoryIn(category, ids), muted: [...muted] }
}

export const useFeedCategoriesStore = defineStore('feedCategories', {
    state: () => ({
        categories: [] as FeedCategory[],
        loaded: false,
        error: ''
    }),

    getters: {
        withFeeds(state): FeedCategory[] {
            return state.categories.filter(c => c.feedIds.length > 0)
        },
        ofFeed(state) {
            return (feedId: string): FeedCategory[] => state.categories.filter(c => c.feedIds.includes(feedId))
        },
        byId(state) {
            return (id: string): FeedCategory | undefined => state.categories.find(c => c.id === id)
        },
        /** A free palette key for the next category, so new categories look different from the existing ones */
        nextColor(state) {
            return (palette: string[]): string => {
                const used = new Set(state.categories.map(c => c.color))
                return palette.find(c => !used.has(c)) ?? palette[state.categories.length % palette.length]
            }
        }
    },

    actions: {
        async fetch() {
            try {
                const response = await axios.get('/feed-categories')
                this.categories = response.data
                this.error = ''
            } catch (error: any) {
                this.error = await apiErrorMessage(error, 'Could not load categories')
            }
            this.loaded = true
        },
        replace(category: FeedCategory) {
            const index = this.categories.findIndex(c => c.id === category.id)
            if (index === -1) this.categories.push(category)
            else this.categories[index] = category
        },
        /** Returns an error text, or null on success */
        async create(input: CategoryInput): Promise<string | null> {
            try {
                const response = await axios.post('/feed-categories', input)
                this.replace(response.data)
                return null
            } catch (error: any) {
                return await apiErrorMessage(error, 'Could not create the category')
            }
        },
        async update(id: string, patch: Partial<CategoryInput>): Promise<string | null> {
            try {
                const response = await axios.put(`/feed-categories/${id}`, patch)
                this.replace(response.data)
                return null
            } catch (error: any) {
                return await apiErrorMessage(error, 'Could not save the category')
            }
        },
        async remove(id: string): Promise<FeedCategory | null> {
            const category = this.byId(id)
            if (!category) return null
            try {
                await axios.delete(`/feed-categories/${id}`)
                this.categories = this.categories.filter(c => c.id !== id)
                return category
            } catch (error: any) {
                this.error = await apiErrorMessage(error, 'Could not delete the category')
                return null
            }
        },
        /** Adds or removes one feed. Optimistic, reverts when the request fails. */
        async setMembership(categoryId: string, feedId: string, member: boolean) {
            const category = this.byId(categoryId)
            if (!category) return
            const before = [...category.feedIds]
            category.feedIds = member
                ? [...new Set([...before, feedId])]
                : before.filter(id => id !== feedId)
            try {
                const call = member ? axios.put : axios.delete
                const response = await call(`/feed-categories/${categoryId}/feeds/${feedId}`)
                this.replace(response.data)
            } catch (error: any) {
                category.feedIds = before
                this.error = await apiErrorMessage(error, 'Could not change the category')
            }
        },
        /** Tap on a category chip that stands for several feeds: all in, or (if all are in already) all out. */
        async toggleFeeds(categoryId: string, feedIds: string[]) {
            const category = this.byId(categoryId)
            if (!category) return
            const allIn = feedIds.every(id => category.feedIds.includes(id))
            await Promise.all(feedIds.map(id => this.setMembership(categoryId, id, !allIn)))
        },
        /** A feed was unfollowed: the server dropped its memberships already */
        forgetFeed(feedId: string) {
            this.categories.forEach(c => { c.feedIds = c.feedIds.filter(id => id !== feedId) })
        }
    }
})
