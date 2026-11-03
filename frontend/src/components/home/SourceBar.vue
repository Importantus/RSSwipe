<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { SlidersHorizontal, X } from 'lucide-vue-next'
import CategoryChip from '@/components/categories/CategoryChip.vue'
import FeedAvatar from '@/components/feeds/FeedAvatar.vue'
import SourceFilterModal from './SourceFilterModal.vue'
import { looseSelection } from './selectionLabel'
import { useFeedStore } from '@/stores/feeds'
import { categoryState, useFeedCategoriesStore, type FeedCategory } from '@/stores/feedCategories'

const feedStore = useFeedStore()
const categories = useFeedCategoriesStore()
const showFilter = ref(false)

onMounted(() => {
  feedStore.getFeedList()
  categories.fetch()
})

const hasCategories = computed(() => categories.withFeeds.length > 0)
const allActive = computed(() => feedStore.selectedIds.length === 0 && feedStore.mutedCategoryIds.length === 0)
const loose = computed(() => (hasCategories.value ? looseSelection(feedStore.selectedIds) : []))

function toggleCategory(category: FeedCategory) {
  feedStore.cycleCategory(category)
  navigator.vibrate?.(10)
}

function chipClasses(active: boolean) {
  return active ? 'bg-primary-600 text-white' : 'bg-secondary-900 text-secondary-300'
}
</script>

<template>
  <div v-if="feedStore.feedList.length > 0" class="flex flex-row gap-2 w-full">
    <div class="flex flex-row gap-2 overflow-x-auto no-scrollbar flex-grow min-w-0 py-1 -my-1">
      <button
        type="button"
        class="flex-none rounded-xl p-2 px-4 text-xs font-text-detail transition"
        :class="chipClasses(allActive)"
        title="All feeds"
        @click="feedStore.resetFilter()"
      >
        All
      </button>

      <template v-if="hasCategories">
        <CategoryChip
          v-for="category in categories.withFeeds"
          :key="category.id"
          :category="category"
          :state="categoryState(category, feedStore.selectedIds)"
:muted="feedStore.isMuted(category.id)"
          @click="toggleCategory(category)"
        />
        <button
          v-if="loose.length > 0"
          type="button"
          class="flex-none flex items-center gap-1 rounded-xl p-2 px-3 text-xs font-text-detail bg-primary-600 text-white"
          title="Clear selection"
          @click="feedStore.unselectAll()"
        >
          {{ loose.length }} {{ loose.length === 1 ? 'feed' : 'feeds' }}
          <X :size="14" />
        </button>
      </template>

      <template v-else>
        <button
          v-for="feed in feedStore.feedList"
          :key="feed.id"
          type="button"
          class="flex-none flex flex-row items-center gap-2 rounded-xl p-2 px-3 text-xs font-text-detail transition"
          :class="chipClasses(feedStore.isFeedSelected(feed.id))"
          @click="feedStore.toggleFeed(feed.id)"
        >
          <FeedAvatar :title="feed.title" :favicon-url="feed.faviconUrl" :size="16" rounded="rounded-sm" />
          <span class="max-w-[4.5rem] truncate">{{ feed.title }}</span>
        </button>
      </template>
    </div>

    <button
      type="button"
      title="Choose sources"
      class="flex-none rounded-xl p-2 px-3 bg-secondary-900 text-secondary-300"
      @click="showFilter = true"
    >
      <SlidersHorizontal :size="16" />
    </button>
  </div>
  <SourceFilterModal :show="showFilter" @close="showFilter = false" />
</template>
