<script setup lang="ts">
import type { CategoryState, FeedCategory } from '@/stores/feedCategories'
import CategoryDot from './CategoryDot.vue'

withDefaults(
  defineProps<{
    category: FeedCategory
    state: CategoryState
    /** Text behind the name, defaults to the number of feeds */
    detail?: string
  }>(),
  { state: 'none' }
)
</script>

<template>
  <button
    type="button"
    :aria-pressed="state === 'full'"
    class="flex-none flex flex-row items-center gap-2 rounded-xl p-2 px-3 text-xs font-text-detail transition"
    :class="{
      'bg-primary-600 text-white': state === 'full',
      'bg-primary-950 text-primary-300 ring-1 ring-primary-600': state === 'partial',
      'bg-secondary-900 text-secondary-300': state === 'none' || state === 'empty'
    }"
  >
    <CategoryDot :color="category.color" :ring="state === 'full'" />
    <span class="max-w-[8rem] truncate">{{ category.name }}</span>
    <span class="opacity-60">{{ detail ?? category.feedIds.length }}</span>
  </button>
</template>
