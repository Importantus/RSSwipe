import { defineStore } from "pinia";
import { StoreStatus } from "./readingList";
import axios from "@/axios";
import { useHomeStore } from "./home";

export interface Category {
    id: string,
    name: string,
    createdAt: Date,
    selected?: boolean
}

export const useCategoriesStore = defineStore({
    id: 'categories',
    state: () => ({
        categories: [] as Category[],
        status: StoreStatus.LOADING
    }),

    getters: {
        selectedCategories(): Category[] {
            return this.categories.filter(c => c.selected)
        }
    },

    actions: {
        async update() {
            this.status = StoreStatus.LOADING
            const response = await axios.get('/categories')
            if (response.status === 200) {
                const categories = response.data as Category[]
                // Remove categories that are not in the response
                for (const category of [...this.categories]) {
                    const index = categories.findIndex(c => c.id === category.id)
                    if (index === -1) {
                        this.categories.splice(this.categories.indexOf(category), 1)
                    }
                }
                // Add new categories
                for (const category of categories) {
                    const index = this.categories.findIndex(c => c.id === category.id)
                    if (index === -1) {
                        this.categories.push(category)
                    }
                }
                // Remove the category with the name "uncategorized"
                const uncategorizedIndex = this.categories.findIndex(c => c.name === "Uncategorized")
                if (uncategorizedIndex !== -1) {
                    this.categories.splice(uncategorizedIndex, 1)
                }
                this.status = StoreStatus.READY
            } else {
                this.status = StoreStatus.ERROR
            }
        },
        unSelectAll() {
            for (const category of this.categories) {
                category.selected = false
            }
            const startPageStore = useHomeStore()
            startPageStore.reload()
        },
        toggleCategory(id: string) {
            const category = this.categories.find(c => c.id === id)
            if (category) {
                category.selected = !category.selected
            }
            const startPageStore = useHomeStore()
            startPageStore.reload()
        },
        isCategorySelected(id: string): boolean {
            const category = this.categories.find(c => c.id === id)
            return category ? category.selected ? category.selected : false : false
        }
    }
})
