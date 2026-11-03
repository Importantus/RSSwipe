<script setup lang="ts">
import { useFeedCategoriesStore } from '@/stores/feedCategories'
import CategoryDot from './CategoryDot.vue'

defineProps<{ feedId: string }>()
const store = useFeedCategoriesStore()
</script>

<template>
  <span
    v-if="store.ofFeed(feedId).length > 0"
    class="flex gap-1 flex-none"
    :title="store.ofFeed(feedId).map((c) => c.name).join(', ')"
  >
    <CategoryDot v-for="c in store.ofFeed(feedId)" :key="c.id" :color="c.color" />
  </span>
</template>
