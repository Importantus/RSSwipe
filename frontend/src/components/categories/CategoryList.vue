<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories'
import CategoryItem from './CategoryItem.vue'
import { useFeedStore } from '@/stores/feeds';

const store = useCategoriesStore()
const feedStore = useFeedStore()

store.update()
</script>

<template>
    <div v-if="store.categories.length > 0 && feedStore.feedList.length > 0"
        class="flex flex-row gap-2 overflow-scroll no-scrollbar">
        <button class="flex flex-row rounded-xl p-2 px-4" @click="store.unSelectAll"
            :class="{ 'bg-primary-600 text-white': (store.categories.filter(category => category.selected).length === 0), 'bg-secondary-900 text-secondary-300': !(store.categories.filter(category => category.selected).length === 0) }">
            <div class="align-middle">
                <p class="font-text-detail text-xs capitalize text-inherit">All</p>
            </div>
        </button>
        <CategoryItem v-for="category in store.categories" :key="category.id" :category="category" />
    </div>
</template>
