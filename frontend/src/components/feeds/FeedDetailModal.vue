<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ExternalLink, Info, Plus, Share2, Trash2 } from 'lucide-vue-next'
import AppModal from '@/components/global/AppModal.vue'
import SwitchToggle from '@/components/global/SwitchToggle.vue'
import CategoryChip from '@/components/categories/CategoryChip.vue'
import FeedAvatar from './FeedAvatar.vue'
import FeedDescription from './feedPage/FeedDescription.vue'
import AddModal from './AddModal.vue'
import { FEED_ERROR_COUNT_THRESHOLD, useFeedStore } from '@/stores/feeds'
import { useFeedCategoriesStore } from '@/stores/feedCategories'
import { useSnackbarStore } from '@/stores/snackbar'
import { hostOf, removeFeeds } from '@/feedActions'

const REPORT_URL = 'https://github.com/Importantus/RSSwipe'

const props = defineProps<{
  /** Hidden while null */
  feedId: string | null
  /** Shown for feeds the user does not follow, e.g. when opened from an article */
  fallback?: { title: string; link: string; faviconUrl?: string | null; description?: string | null }
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const router = useRouter()
const feedStore = useFeedStore()
const categories = useFeedCategoriesStore()
const snackbar = useSnackbarStore()

const showNew = ref(false)
const canShare = ref(false)
onMounted(() => {
  canShare.value = typeof navigator.share === 'function'
})

const feed = computed(() => feedStore.feedList.find((f) => f.id === props.feedId))
const subscribed = computed(() => !!feed.value)
const title = computed(() => feed.value?.title ?? props.fallback?.title ?? '')
const link = computed(() => feed.value?.url ?? props.fallback?.link ?? '')
const faviconUrl = computed(() => feed.value?.faviconUrl ?? props.fallback?.faviconUrl)
const description = computed(() => feed.value?.description ?? props.fallback?.description)
const hasError = computed(() => (feed.value?.error_count ?? 0) > FEED_ERROR_COUNT_THRESHOLD)

const openInApp = computed({
  get: () => feed.value?.openInApp ?? true,
  set: () => {
    if (props.feedId) feedStore.toggleOpenInApp(props.feedId)
  }
})

function toggleCategory(categoryId: string) {
  const category = categories.byId(categoryId)
  if (!category || !props.feedId) return
  categories.setMembership(categoryId, props.feedId, !category.feedIds.includes(props.feedId))
}

function showOnlyThisFeed() {
  if (!props.feedId) return
  feedStore.setSelection([props.feedId])
  snackbar.show(`Showing only “${title.value}”`)
  emit('close')
  router.push({ name: 'home' })
}

function openWebsite() {
  try {
    window.open(new URL(link.value).origin, '_blank')
  } catch {
    window.open(link.value, '_blank')
  }
}

function share() {
  navigator.share({ title: title.value, url: link.value }).catch(() => {})
}

async function subscribe() {
  const item = await feedStore.addFeed(link.value, true)
  if (item) snackbar.show(`Subscribed to “${item.title}”`)
}

async function unfollow() {
  if (!props.feedId) return
  emit('close')
  await removeFeeds([props.feedId])
}
</script>

<template>
  <AppModal :show="feedId !== null" @close="emit('close')">
    <template #title>
      <span class="flex items-center gap-3 font-normal">
        <FeedAvatar :title="title || '?'" :favicon-url="faviconUrl" :size="32" />
        <span class="flex flex-col min-w-0">
          <span class="truncate font-semibold">{{ title }}</span>
          <span class="truncate text-sm text-background-500 font-text-detail">{{ hostOf(link) }}</span>
        </span>
      </span>
    </template>

    <div class="flex flex-col gap-4 overflow-y-auto no-scrollbar min-h-0">
      <FeedDescription v-if="description" :description="description" />

      <div v-if="feed?.errormessage">
        <div class="flex flex-row items-center gap-2 bg-red-800 rounded-t-lg px-3 py-2">
          <Info :size="25" class="flex-none" />
          <p class="text-left font-thin text-sm">
            We failed to fetch this feed {{ feed.error_count }} times. Error messages related to the
            app can be reported <a class="underline" :href="REPORT_URL">here</a>.
          </p>
        </div>
        <p class="bg-red-500 rounded-b-lg px-3 py-2 text-sm">{{ feed.errormessage }}</p>
      </div>
      <p v-else-if="hasError" class="text-sm text-red-400">This feed could not be fetched recently.</p>

      <template v-if="subscribed">
        <div>
          <div class="text-xs font-text-detail uppercase tracking-wider text-background-400 mb-2">Categories</div>
          <div class="flex flex-wrap gap-2">
            <CategoryChip
              v-for="category in categories.categories"
              :key="category.id"
              :category="category"
              :state="feedId && category.feedIds.includes(feedId) ? 'full' : 'none'"
              detail=""
              @click="toggleCategory(category.id)"
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
        </div>

        <div class="flex justify-between items-center gap-3">
          <div>
            <h3 class="font-semibold">Open in App?</h3>
            <p class="text-secondary-500 font-thin text-sm">Should feed articles open in the app?</p>
          </div>
          <SwitchToggle v-model="openInApp" title="Open feed articles in the app" />
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 h-11 bg-primary-600 rounded-lg hover:bg-primary-700 transition px-3"
            @click="showOnlyThisFeed"
          >
            Only this feed
          </button>
          <button
            v-if="canShare"
            type="button"
            title="Share feed"
            class="w-11 h-11 flex-none bg-secondary-800 rounded-lg hover:bg-secondary-700 transition flex items-center justify-center"
            @click="share"
          >
            <Share2 :size="20" />
          </button>
          <button
            type="button"
            title="Open website"
            class="w-11 h-11 flex-none bg-secondary-800 rounded-lg hover:bg-secondary-700 transition flex items-center justify-center"
            @click="openWebsite"
          >
            <ExternalLink :size="20" />
          </button>
          <button
            type="button"
            title="Unfollow"
            class="w-11 h-11 flex-none bg-black/30 rounded-lg hover:bg-red-900 transition flex items-center justify-center"
            @click="unfollow"
          >
            <Trash2 :size="20" class="text-background-300" />
          </button>
        </div>
      </template>

      <button
        v-else
        type="button"
        title="Subscribe to feed"
        class="w-full h-11 bg-primary-600 rounded-lg hover:bg-primary-700 transition"
        @click="subscribe"
      >
        Subscribe
      </button>
    </div>

    <AddModal
      :show="showNew"
      initial-mode="category"
      :preset-feed-ids="feedId ? [feedId] : []"
      @close="showNew = false"
    />
  </AppModal>
</template>
