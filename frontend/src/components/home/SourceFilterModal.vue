<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown, Minus, Search } from 'lucide-vue-next'
import AppModal from '@/components/global/AppModal.vue'
import TextInputField from '@/components/global/TextInputField.vue'
import CategoryChip from '@/components/categories/CategoryChip.vue'
import CategoryDot from '@/components/categories/CategoryDot.vue'
import FeedAvatar from '@/components/feeds/FeedAvatar.vue'
import { selectionLabel } from './selectionLabel'
import { useFeedStore, type FeedItem } from '@/stores/feeds'
import {
  categoryState,
  toggleCategoryIn,
  useFeedCategoriesStore,
  type CategoryState,
  type FeedCategory
} from '@/stores/feedCategories'
import { useSnackbarStore } from '@/stores/snackbar'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const feedStore = useFeedStore()
const categories = useFeedCategoriesStore()
const snackbar = useSnackbarStore()

// Changes are staged here and applied with "Done", so the cards do not reload on every tap
const draft = ref<string[]>([])
const search = ref('')
const collapsed = ref<Set<string>>(new Set())

watch(
  () => props.show,
  (show) => {
    if (!show) return
    draft.value = [...feedStore.selectedIds]
    search.value = ''
    collapsed.value = new Set()
  },
  { immediate: true }
)

interface Group {
  key: string
  category: FeedCategory | null
  feeds: FeedItem[]
}

const groups = computed<Group[]>(() => {
  const term = search.value.trim().toLowerCase()
  const matches = (feed: FeedItem) => !term || feed.title.toLowerCase().includes(term) || feed.url.toLowerCase().includes(term)
  const byId = new Map(feedStore.feedList.map((f) => [f.id, f]))
  const result: Group[] = categories.withFeeds.map((category) => ({
    key: category.id,
    category,
    feeds: category.feedIds.map((id) => byId.get(id)).filter((f): f is FeedItem => !!f && matches(f))
  }))
  result.push({
    key: 'none',
    category: null,
    feeds: feedStore.feedList.filter((f) => categories.ofFeed(f.id).length === 0 && matches(f))
  })
  return result.filter((g) => g.feeds.length > 0)
})

function isOpen(group: Group) {
  return !collapsed.value.has(group.key) || search.value.trim() !== ''
}

function toggleCollapsed(key: string) {
  const next = new Set(collapsed.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsed.value = next
}

function toggleFeed(id: string) {
  draft.value = draft.value.includes(id) ? draft.value.filter((f) => f !== id) : [...draft.value, id]
}

function stateOf(category: FeedCategory): CategoryState {
  return categoryState(category, draft.value)
}

function apply() {
  const before = [...feedStore.selectedIds]
  feedStore.setSelection(draft.value)
  snackbar.show(`Showing: ${selectionLabel(feedStore.selectedIds)}`, () => feedStore.setSelection(before))
  emit('close')
}
</script>

<template>
  <AppModal :show="show" title="Choose sources" @close="emit('close')">
    <TextInputField v-model="search" placeholder="Search" :icon="Search" class="mb-3" />

    <div v-if="categories.withFeeds.length > 0" class="flex flex-wrap gap-2 mb-3">
      <CategoryChip
        v-for="category in categories.withFeeds"
        :key="category.id"
        :category="category"
        :state="stateOf(category)"
        @click="draft = toggleCategoryIn(category, draft)"
      />
    </div>

    <div class="overflow-y-auto no-scrollbar h-72 min-h-0">
      <p v-if="groups.length === 0" class="text-sm text-background-500 py-8 text-center">
        No feed matches “{{ search }}”.
      </p>
      <div v-for="group in groups" :key="group.key" class="mb-2">
        <div class="flex items-center gap-3 py-2">
          <button
            v-if="group.category"
            type="button"
            :aria-label="`Select all in ${group.category.name}`"
            class="w-5 h-5 rounded-md flex-none flex items-center justify-center"
            :class="
              stateOf(group.category) === 'full'
                ? 'bg-primary-600'
                : stateOf(group.category) === 'partial'
                  ? 'bg-primary-950 border border-primary-600 text-primary-300'
                  : 'border border-secondary-600'
            "
            @click="draft = toggleCategoryIn(group.category, draft)"
          >
            <Check v-if="stateOf(group.category) === 'full'" :size="14" />
            <Minus v-else-if="stateOf(group.category) === 'partial'" :size="14" />
          </button>
          <span v-else class="w-5 flex-none"></span>
          <button
            type="button"
            class="flex-1 flex items-center gap-2 text-left text-xs font-text-detail uppercase tracking-wider text-background-300"
            @click="toggleCollapsed(group.key)"
          >
            <CategoryDot v-if="group.category" :color="group.category.color" />
            <span class="truncate">{{ group.category ? group.category.name : 'No category' }}</span>
            <span class="text-background-500">{{ group.feeds.length }}</span>
            <ChevronDown :size="16" class="ml-auto transition" :class="{ 'rotate-180': isOpen(group) }" />
          </button>
        </div>
        <template v-if="isOpen(group)">
          <button
            v-for="feed in group.feeds"
            :key="feed.id"
            type="button"
            class="w-full flex items-center gap-3 py-2 pl-2 text-left"
            @click="toggleFeed(feed.id)"
          >
            <span
              class="w-5 h-5 rounded-md flex-none flex items-center justify-center"
              :class="draft.includes(feed.id) ? 'bg-primary-600' : 'border border-secondary-600'"
            >
              <Check v-if="draft.includes(feed.id)" :size="14" />
            </span>
            <FeedAvatar :title="feed.title" :favicon-url="feed.faviconUrl" :size="28" rounded="rounded-md" />
            <span class="flex-1 truncate text-sm">{{ feed.title }}</span>
          </button>
        </template>
      </div>
    </div>

    <div class="flex gap-2 mt-4">
      <button
        type="button"
        class="h-14 px-5 bg-secondary-800 rounded-lg hover:bg-secondary-700 transition"
        @click="draft = []"
      >
        Reset
      </button>
      <button
        type="button"
        class="w-full h-14 bg-primary-600 rounded-lg hover:bg-primary-700 transition font-semibold"
        @click="apply"
      >
        {{ draft.length > 0 ? `Done · ${draft.length} ${draft.length === 1 ? 'feed' : 'feeds'}` : 'Done · All feeds' }}
      </button>
    </div>
  </AppModal>
</template>
