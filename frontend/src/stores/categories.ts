import { defineStore } from "pinia";
import { StoreStatus } from "./readingList";
import axios from "@/axios";
import { useStartPageStore } from "./startPage";

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

                this.status = StoreStatus.READY
            } else {
                this.status = StoreStatus.ERROR
            }
        },
        unSelectAll() {
            for (const category of this.categories) {
                category.selected = false
            }
        },
        toggleCategory(id: string) {
            const category = this.categories.find(c => c.id === id)
            if (category) {
                category.selected = !category.selected
            }

            const startPageStore = useStartPageStore()
            startPageStore.reload()
        },
        isCategorySelected(id: string): boolean {
            const category = this.categories.find(c => c.id === id)
            return category ? category.selected ? category.selected : false : false
        }
    },
    getters: {
        selectedCategories(): Category[] {
            return this.categories.filter(c => c.selected)
        }
    }
})