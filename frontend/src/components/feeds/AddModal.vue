<script setup lang="ts">
import { ref, watch } from 'vue'
import { Link, Rss, Tag } from 'lucide-vue-next'
import AppModal from '@/components/global/AppModal.vue'
import SwitchToggle from '@/components/global/SwitchToggle.vue'
import TextInputField from '@/components/global/TextInputField.vue'
import CategoryChip from '@/components/categories/CategoryChip.vue'
import CategoryForm from '@/components/categories/CategoryForm.vue'
import { useFeedStore } from '@/stores/feeds'
import { useFeedCategoriesStore } from '@/stores/feedCategories'
import { useSnackbarStore } from '@/stores/snackbar'

const props = defineProps<{
  show: boolean
  initialMode?: 'feed' | 'category'
  /** Categories that are preselected for a new feed */
  presetCategoryIds?: string[]
  /** Feeds that are preselected for a new category */
  presetFeedIds?: string[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const feedStore = useFeedStore()
const categories = useFeedCategoriesStore()
const snackbar = useSnackbarStore()

const mode = ref<'feed' | 'category'>('feed')
const url = ref('')
const openInApp = ref(true)
const selectedCategories = ref<string[]>([])
const busy = ref(false)
// A new key resets the category form whenever the dialog opens
const formKey = ref(0)

watch(
  () => props.show,
  (show) => {
    if (!show) return
    mode.value = props.initialMode ?? 'feed'
    url.value = ''
    openInApp.value = true
    selectedCategories.value = [...(props.presetCategoryIds ?? [])]
    feedStore.error = ''
    formKey.value++
  },
  { immediate: true }
)

function toggleCategory(id: string) {
  selectedCategories.value = selectedCategories.value.includes(id)
    ? selectedCategories.value.filter((c) => c !== id)
    : [...selectedCategories.value, id]
}

async function addFeed() {
  const value = url.value.trim()
  if (!value || busy.value) return
  busy.value = true
  const item = await feedStore.addFeed(value, openInApp.value)
  if (item) {
    await Promise.all(selectedCategories.value.map((id) => categories.setMembership(id, item.id, true)))
    snackbar.show(`Added “${item.title}”`)
  }
  busy.value = false
  if (item) emit('close')
}
</script>

<template>
  <AppModal :show="show" title="Add" @close="emit('close')">
    <div
      class="grid grid-cols-2 gap-1 p-1 bg-secondary-900 rounded-xl mb-4"
      role="tablist"
      aria-label="What do you want to add?"
    >
      <button
        v-for="tab in [
          { key: 'feed', label: 'Feed', icon: Rss },
          { key: 'category', label: 'Category', icon: Tag }
        ] as const"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="mode === tab.key"
        class="h-10 rounded-lg text-sm font-text-detail flex items-center justify-center gap-2 transition"
        :class="mode === tab.key ? 'bg-primary-600 text-white' : 'text-secondary-300'"
        @click="mode = tab.key"
      >
        <component :is="tab.icon" :size="16" />
        {{ tab.label }}
      </button>
    </div>

    <form v-if="mode === 'feed'" class="flex flex-col gap-4 min-h-0 overflow-y-auto no-scrollbar" @submit.prevent="addFeed">
      <TextInputField v-model="url" placeholder="URL" :icon="Link" :required="true" />
      <div v-if="categories.categories.length > 0">
        <div class="text-xs font-text-detail uppercase tracking-wider text-background-400 mb-2">Categories</div>
        <div class="flex flex-wrap gap-2">
          <CategoryChip
            v-for="category in categories.categories"
            :key="category.id"
            :category="category"
            :state="selectedCategories.includes(category.id) ? 'full' : 'none'"
            detail=""
            @click="toggleCategory(category.id)"
          />
        </div>
      </div>
      <div class="flex justify-between items-center gap-3">
        <div>
          <h3 class="font-semibold">Open in App?</h3>
          <p class="text-background-500 font-light text-sm">Should feed articles open in the app?</p>
        </div>
        <SwitchToggle v-model="openInApp" title="Open feed articles in the app" />
      </div>
      <p v-if="feedStore.error" class="text-sm text-red-400" role="alert">{{ feedStore.error }}</p>
      <button
        type="submit"
        class="w-full h-14 bg-primary-600 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        :disabled="url.trim().length === 0 || busy"
      >
        {{ busy ? 'Adding…' : 'Add Feed' }}
      </button>
    </form>

    <CategoryForm v-else :key="formKey" :preset-feed-ids="presetFeedIds" @done="emit('close')" />
  </AppModal>
</template>
