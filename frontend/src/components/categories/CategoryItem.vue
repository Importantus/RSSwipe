<script setup lang="ts">
import { useCategoriesStore, type Category } from '@/stores/categories'

const props = defineProps<{
    category: Category
}>()

const store = useCategoriesStore()

</script>

<template>
    <button class="flex flex-row rounded-xl p-2 px-3" @click="store.toggleCategory(props.category.id)"
        :class="{ 'bg-primary-600 text-white': store.isCategorySelected(props.category.id), 'bg-secondary-900 text-secondary-300': !store.isCategorySelected(props.category.id) }">

        <p class="font-text-detail text-xs text-inherit capitalize">
            {{ props.category.name }}</p>
    </button>
</template>