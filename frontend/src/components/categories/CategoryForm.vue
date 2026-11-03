<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Tag, Trash2 } from 'lucide-vue-next'
import TextInputField from '@/components/global/TextInputField.vue'
import FeedAvatar from '@/components/feeds/FeedAvatar.vue'
import { useFeedStore } from '@/stores/feeds'
import { useFeedCategoriesStore, type FeedCategory } from '@/stores/feedCategories'
import { useSnackbarStore } from '@/stores/snackbar'
import { CATEGORY_COLORS, CATEGORY_COLOR_KEYS } from './categoryColors'

const props = defineProps<{
  /** Set to edit an existing category, leave out to create one */
  category?: FeedCategory
  presetFeedIds?: string[]
}>()

const emit = defineEmits<{ (e: 'done'): void }>()

const feedStore = useFeedStore()
const categories = useFeedCategoriesStore()
const snackbar = useSnackbarStore()

const name = ref(props.category?.name ?? '')
const color = ref(props.category?.color ?? categories.nextColor(CATEGORY_COLOR_KEYS))
const feedIds = ref<string[]>([...(props.category?.feedIds ?? props.presetFeedIds ?? [])])
const error = ref('')
const busy = ref(false)

const trimmed = computed(() => name.value.trim())
const duplicate = computed(() =>
  categories.categories.some(
    (c) => c.id !== props.category?.id && c.name.toLowerCase() === trimmed.value.toLowerCase()
  )
)
const message = computed(() =>
  duplicate.value ? 'A category with this name already exists.' : error.value
)

function toggleFeed(id: string) {
  feedIds.value = feedIds.value.includes(id)
    ? feedIds.value.filter((f) => f !== id)
    : [...feedIds.value, id]
}

async function save() {
  if (!trimmed.value || duplicate.value || busy.value) return
  busy.value = true
  error.value = ''
  const input = { name: trimmed.value, color: color.value, feedIds: feedIds.value }
  const failure = props.category
    ? await categories.update(props.category.id, input)
    : await categories.create(input)
  busy.value = false
  if (failure) {
    error.value = failure
    return
  }
  if (!props.category) snackbar.show(`Created category “${trimmed.value}”`)
  emit('done')
}

async function remove() {
  if (!props.category || busy.value) return
  busy.value = true
  const removed = await categories.remove(props.category.id)
  busy.value = false
  if (!removed) {
    error.value = categories.error
    return
  }
  snackbar.show(`Deleted category “${removed.name}”`, async () => {
    await categories.create({ name: removed.name, color: removed.color, feedIds: removed.feedIds })
  })
  emit('done')
}
</script>

<template>
  <form class="flex flex-col gap-4 min-h-0" @submit.prevent="save">
    <div>
      <TextInputField v-model="name" placeholder="Name" :icon="Tag" :required="true" />
      <p class="text-xs text-red-400 mt-1 min-h-4" role="alert">{{ message }}</p>
    </div>
    <div class="flex gap-3 flex-wrap">
      <button
        v-for="key in CATEGORY_COLOR_KEYS"
        :key="key"
        type="button"
        :title="key"
        :aria-label="key"
        :aria-pressed="color === key"
        class="w-8 h-8 rounded-full flex items-center justify-center transition"
        :class="{ 'ring-2 ring-white ring-offset-2 ring-offset-secondary-950': color === key }"
        :style="{ background: CATEGORY_COLORS[key] }"
        @click="color = key"
      >
        <Check v-if="color === key" :size="16" class="text-black/70" />
      </button>
    </div>
    <div class="min-h-0 flex flex-col">
      <div class="text-xs font-text-detail uppercase tracking-wider text-background-400 mb-1">
        Feeds · {{ feedIds.length }}
      </div>
      <div class="max-h-44 overflow-y-auto no-scrollbar">
        <p v-if="feedStore.feedList.length === 0" class="text-sm text-background-500 py-2">
          You do not follow any feeds yet.
        </p>
        <button
          v-for="feed in feedStore.feedList"
          :key="feed.id"
          type="button"
          class="w-full flex items-center gap-3 py-2 text-left"
          @click="toggleFeed(feed.id)"
        >
          <span
            class="w-5 h-5 rounded-md flex-none flex items-center justify-center"
            :class="feedIds.includes(feed.id) ? 'bg-primary-600' : 'border border-secondary-600'"
          >
            <Check v-if="feedIds.includes(feed.id)" :size="14" />
          </span>
          <FeedAvatar :title="feed.title" :favicon-url="feed.faviconUrl" :size="28" rounded="rounded-md" />
          <span class="flex-1 truncate text-sm">{{ feed.title }}</span>
        </button>
      </div>
    </div>
    <div class="flex gap-2">
      <button
        v-if="category"
        type="button"
        title="Delete category"
        class="w-14 h-14 flex-none bg-black/30 rounded-lg hover:bg-red-900 transition flex items-center justify-center"
        :disabled="busy"
        @click="remove"
      >
        <Trash2 :size="22" class="text-background-300" />
      </button>
      <button
        type="submit"
        class="w-full h-14 bg-primary-600 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        :disabled="!trimmed || duplicate || busy"
      >
        {{ category ? 'Save' : 'Create category' }}
      </button>
    </div>
  </form>
</template>
