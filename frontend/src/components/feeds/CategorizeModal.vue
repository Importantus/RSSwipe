<script setup lang="ts">
import { ref } from 'vue'
import AppModal from '@/components/global/AppModal.vue'
import CategoryChip from '@/components/categories/CategoryChip.vue'
import AddModal from './AddModal.vue'
import { useFeedCategoriesStore, type CategoryState, type FeedCategory } from '@/stores/feedCategories'
import { Plus } from 'lucide-vue-next'

const props = defineProps<{ show: boolean; feedIds: string[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const categories = useFeedCategoriesStore()
const showNew = ref(false)

function insideCount(category: FeedCategory): number {
  return props.feedIds.filter((id) => category.feedIds.includes(id)).length
}

function stateFor(category: FeedCategory): CategoryState {
  const inside = insideCount(category)
  if (inside === 0) return 'none'
  return inside === props.feedIds.length ? 'full' : 'partial'
}

function detail(category: FeedCategory): string {
  return stateFor(category) === 'partial' ? `${insideCount(category)}/${props.feedIds.length}` : ''
}
</script>

<template>
  <AppModal
    :show="show"
    :title="feedIds.length === 1 ? 'Categories' : `Categories for ${feedIds.length} feeds`"
    @close="emit('close')"
  >
    <div class="flex flex-wrap gap-2 mb-5">
      <CategoryChip
        v-for="category in categories.categories"
        :key="category.id"
        :category="category"
        :state="stateFor(category)"
        :detail="detail(category)"
        @click="categories.toggleFeeds(category.id, feedIds)"
      />
      <button
        type="button"
        class="flex-none flex items-center gap-1 rounded-xl p-2 px-3 text-xs font-text-detail border border-dashed border-secondary-600 text-secondary-300"
        @click="showNew = true"
      >
        <Plus :size="14" />
        New
      </button>
    </div>
    <button
      type="button"
      class="w-full h-14 bg-primary-600 rounded-lg hover:bg-primary-700 transition font-semibold"
      @click="emit('close')"
    >
      Done
    </button>
    <AddModal :show="showNew" initial-mode="category" :preset-feed-ids="feedIds" @close="showNew = false" />
  </AppModal>
</template>
