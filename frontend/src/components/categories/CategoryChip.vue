<script setup lang="ts">
import { EyeOff } from 'lucide-vue-next'
import type { CategoryState, FeedCategory } from '@/stores/feedCategories'
import CategoryDot from './CategoryDot.vue'

withDefaults(
  defineProps<{
    category: FeedCategory
    state: CategoryState
    /** Text behind the name, defaults to the number of feeds */
    detail?: string
    /** The category is hidden from the home screen */
    muted?: boolean
  }>(),
  { state: 'none' }
)
</script>

<template>
  <button
    type="button"
    :aria-pressed="muted ? false : state === 'full'"
    :title="muted ? 'Hidden – tap to reset' : state === 'full' ? 'Shown – tap to hide' : undefined"
    class="flex-none flex flex-row items-center gap-2 rounded-xl p-2 px-3 text-xs font-text-detail transition"
    :class="{
      'bg-primary-600 text-white': !muted && state === 'full',
      'bg-primary-950 text-primary-300 ring-1 ring-primary-600': !muted && state === 'partial',
      'bg-secondary-900 text-secondary-300': !muted && (state === 'none' || state === 'empty'),
      'bg-transparent text-secondary-500 ring-1 ring-inset ring-secondary-700': muted
    }"
  >
    <EyeOff v-if="muted" :size="14" class="flex-none" />
    <CategoryDot v-else :color="category.color" :ring="state === 'full'" />
    <span class="max-w-[8rem] truncate" :class="{ 'line-through': muted }">{{ category.name }}</span>
    <span v-if="!muted" class="opacity-60">{{ detail ?? category.feedIds.length }}</span>
  </button>
</template>
