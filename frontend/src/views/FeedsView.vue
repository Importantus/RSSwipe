<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MoreVertical, Pencil, Plus, Rss, Tag, Trash2, Upload, Download, X } from 'lucide-vue-next'
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue'
import NonBlockingLoadIndicator from '@/components/global/loadingIndicators/NonBlockingLoadIndicator.vue'
import CategoryChip from '@/components/categories/CategoryChip.vue'
import CategoryDot from '@/components/categories/CategoryDot.vue'
import CategoryEditModal from '@/components/categories/CategoryEditModal.vue'
import AddModal from '@/components/feeds/AddModal.vue'
import CategorizeModal from '@/components/feeds/CategorizeModal.vue'
import FeedDetailModal from '@/components/feeds/FeedDetailModal.vue'
import FeedRow from '@/components/feeds/FeedRow.vue'
import { useFeedStore, type FeedItem, type ImportResult } from '@/stores/feeds'
import { useFeedCategoriesStore, type FeedCategory } from '@/stores/feedCategories'
import { useSnackbarStore } from '@/stores/snackbar'
import { StoreStatus } from '@/stores/readingList'
import { removeFeeds } from '@/feedActions'

const feedStore = useFeedStore()
const categories = useFeedCategoriesStore()
const snackbar = useSnackbarStore()

const activeCategoryId = ref<string | null>(null)
const grouped = ref(true)
const selection = ref<Set<string> | null>(null)
const menuOpen = ref(false)
const isImporting = ref(false)
const fileInput = ref<HTMLInputElement>()

const addModal = ref<{ mode: 'feed' | 'category'; feedIds: string[] } | null>(null)
const detailFeedId = ref<string | null>(null)
const categorizeIds = ref<string[] | null>(null)
const editedCategory = ref<FeedCategory | null>(null)

onMounted(() => {
  feedStore.getFeedList()
  categories.fetch()
})

const activeCategory = computed(() => (activeCategoryId.value ? categories.byId(activeCategoryId.value) : undefined))

const feedsById = computed(() => new Map(feedStore.feedList.map((f) => [f.id, f])))
function feedsOf(ids: string[]): FeedItem[] {
  return ids.map((id) => feedsById.value.get(id)).filter((f): f is FeedItem => !!f)
}

interface FeedGroup {
  key: string
  category: FeedCategory | null
  feeds: FeedItem[]
}

const groups = computed(() => {
  const result: FeedGroup[] = categories.withFeeds.map((c) => ({ key: c.id, category: c, feeds: feedsOf(c.feedIds) }))
  const loose = feedStore.feedList.filter((f) => categories.ofFeed(f.id).length === 0)
  if (loose.length > 0) result.push({ key: 'none', category: null, feeds: loose })
  return result
})

const showGroups = computed(() => !activeCategory.value && grouped.value && categories.withFeeds.length > 0)
const showOnboarding = computed(() => categories.loaded && categories.categories.length === 0 && feedStore.feedList.length >= 5)

function onTap(feed: FeedItem) {
  if (!selection.value) {
    detailFeedId.value = feed.id
    return
  }
  const next = new Set(selection.value)
  if (next.has(feed.id)) next.delete(feed.id)
  else next.add(feed.id)
  selection.value = next
}

function startSelection(feed: FeedItem) {
  selection.value = new Set([feed.id])
}

async function removeSelected() {
  const ids = [...(selection.value ?? [])]
  selection.value = null
  await removeFeeds(ids)
}

async function importOpml(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  isImporting.value = true
  const result: ImportResult | null = await feedStore.importOpml(file)
  isImporting.value = false
  if (result) {
    snackbar.show(`${result.imported} imported, ${result.skipped} already subscribed, ${result.failed.length} failed`)
  }
}

function openNewCategory() {
  addModal.value = { mode: 'category', feedIds: [...(selection.value ?? [])] }
  selection.value = null
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" @click="menuOpen = false">
    <div class="px-5 flex flex-col gap-2 z-20 bg-background-950">
      <TitleNavigationBar v-if="!selection" title="Your Feeds" backNavigationPath="/">
        <div class="relative">
          <button type="button" title="More" class="p-2" @click.stop="menuOpen = !menuOpen">
            <MoreVertical :size="22" />
          </button>
          <div
            v-if="menuOpen"
            class="absolute right-0 top-11 z-30 w-48 rounded-xl bg-secondary-900 border border-secondary-800 shadow-xl py-1 text-sm"
          >
            <input ref="fileInput" type="file" accept=".opml,.xml,text/xml" class="hidden" @change="importOpml" />
            <button
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-50"
              :disabled="isImporting"
              @click="fileInput?.click()"
            >
              <Upload :size="18" />
              {{ isImporting ? 'Importing…' : 'Import OPML' }}
            </button>
            <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left" @click="feedStore.exportOpml()">
              <Download :size="18" />
              Export OPML
            </button>
          </div>
        </div>
      </TitleNavigationBar>
      <div v-else class="flex flex-row items-center justify-between mt-5 py-5 gap-1">
        <button type="button" title="Cancel selection" class="p-1" @click="selection = null">
          <X :size="24" />
        </button>
        <h1 class="flex-1 truncate text-2xl font-bold ml-2">{{ selection.size }} selected</h1>
        <button
          type="button"
          title="Add to category"
          class="p-2 disabled:opacity-40"
          :disabled="selection.size === 0"
          @click="categorizeIds = [...selection]"
        >
          <Tag :size="22" />
        </button>
        <button
          type="button"
          title="Unfollow"
          class="p-2 disabled:opacity-40"
          :disabled="selection.size === 0"
          @click="removeSelected"
        >
          <Trash2 :size="22" />
        </button>
      </div>

      <div v-if="feedStore.feedList.length > 0" class="flex flex-row gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
        <button
          type="button"
          class="flex-none rounded-xl p-2 px-4 text-xs font-text-detail transition"
          :class="activeCategoryId === null ? 'bg-primary-600 text-white' : 'bg-secondary-900 text-secondary-300'"
          @click="activeCategoryId = null"
        >
          All
        </button>
        <CategoryChip
          v-for="category in categories.categories"
          :key="category.id"
          :category="category"
          :state="activeCategoryId === category.id ? 'full' : 'none'"
          @click="activeCategoryId = activeCategoryId === category.id ? null : category.id"
        />
        <button
          type="button"
          class="flex-none flex items-center gap-1 rounded-xl p-2 px-3 text-xs font-text-detail border border-dashed border-secondary-600 text-secondary-300"
          @click="openNewCategory"
        >
          <Plus :size="14" />
          New
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-5 pb-28 no-scrollbar">
      <NonBlockingLoadIndicator :show="feedStore.state === StoreStatus.LOADING" />
      <div v-if="feedStore.error" class="w-full bg-red-500 rounded-lg p-3 mb-5">{{ feedStore.error }}</div>

      <div v-if="feedStore.feedList.length === 0 && feedStore.state === StoreStatus.READY" class="flex w-full items-center justify-center flex-col mt-[12vh]">
        <img src="/images/LovingDoodle.svg" alt="A Person holding a heart in their hands" class="w-[80%]" />
        <p class="text-background-600 m-0 mt-2">No subscribed feeds yet.</p>
        <button
          type="button"
          class="flex items-center px-5 py-2 bg-primary-600 rounded-lg gap-2 mt-5 font-semibold"
          @click="addModal = { mode: 'feed', feedIds: [] }"
        >
          <Rss :size="20" />
          Add your first feed
        </button>
      </div>

      <template v-else>
        <div v-if="showOnboarding" class="bg-white/10 rounded-xl p-4 mb-4 flex flex-col gap-3">
          <div>
            <h2 class="font-semibold mb-1">Sort your feeds into categories</h2>
            <p class="text-sm text-background-300 font-light">
              Pick a topic on the home screen with one tap instead of choosing feed by feed.
            </p>
          </div>
          <button type="button" class="h-11 bg-primary-600 rounded-lg font-semibold" @click="openNewCategory">
            Create category
          </button>
        </div>

        <div v-if="activeCategory" class="flex items-center gap-2 mb-3 text-sm text-background-300">
          <CategoryDot :color="activeCategory.color" />
          <span class="font-semibold text-white truncate">{{ activeCategory.name }}</span>
          <span class="flex-none">· {{ activeCategory.feedIds.length }} {{ activeCategory.feedIds.length === 1 ? 'feed' : 'feeds' }}</span>
          <button type="button" title="Edit category" class="ml-auto p-2 rounded-lg bg-secondary-900" @click="editedCategory = activeCategory!">
            <Pencil :size="16" />
          </button>
        </div>
        <div v-else-if="categories.withFeeds.length > 0" class="flex justify-end mb-1">
          <button type="button" class="text-xs font-text-detail text-background-400 py-1" @click="grouped = !grouped">
            {{ grouped ? 'Grouped · switch to flat' : 'Flat · switch to grouped' }}
          </button>
        </div>

        <template v-if="activeCategory">
          <div v-if="activeCategory.feedIds.length === 0" class="flex flex-col items-center gap-4 mt-[10vh] text-center">
            <p class="text-background-500">No feeds in this category yet.</p>
            <button type="button" class="px-5 py-2 bg-primary-600 rounded-lg font-semibold" @click="editedCategory = activeCategory">
              Add feeds
            </button>
          </div>
          <div v-else class="flex flex-col gap-3">
            <FeedRow
              v-for="feed in feedsOf(activeCategory.feedIds)"
              :key="feed.id"
              :feed="feed"
              :selecting="!!selection"
              :selected="selection?.has(feed.id)"
              @tap="onTap(feed)"
              @select="startSelection(feed)"
              @remove="removeFeeds([feed.id])"
              @categorize="categorizeIds = [feed.id]"
            />
          </div>
        </template>

        <template v-else-if="showGroups">
          <div v-for="group in groups" :key="group.key" class="mb-5">
            <div class="flex items-center gap-2 mb-2 text-xs font-text-detail uppercase tracking-wider text-background-400">
              <CategoryDot v-if="group.category" :color="group.category.color" />
              <span class="truncate">{{ group.category ? group.category.name : 'No category' }}</span>
              <span>{{ group.feeds.length }}</span>
            </div>
            <div class="flex flex-col gap-3">
              <FeedRow
                v-for="feed in group.feeds"
                :key="feed.id"
                :feed="feed"
                :selecting="!!selection"
                :selected="selection?.has(feed.id)"
                @tap="onTap(feed)"
                @select="startSelection(feed)"
                @remove="removeFeeds([feed.id])"
                @categorize="categorizeIds = [feed.id]"
              />
            </div>
          </div>
        </template>

        <div v-else class="flex flex-col gap-3">
          <FeedRow
            v-for="feed in feedStore.feedList"
            :key="feed.id"
            :feed="feed"
            :selecting="!!selection"
            :selected="selection?.has(feed.id)"
            @tap="onTap(feed)"
            @select="startSelection(feed)"
            @remove="removeFeeds([feed.id])"
            @categorize="categorizeIds = [feed.id]"
          />
        </div>
      </template>
    </div>

    <div v-if="!selection" class="fixed bottom-0 left-0 right-0 max-w-xl m-auto z-50 pointer-events-none">
      <button
        type="button"
        title="Add feed or category"
        class="bg-primary-600 rounded-full absolute bottom-10 right-5 p-2 z-20 pointer-events-auto"
        @click="addModal = { mode: 'feed', feedIds: [] }"
      >
        <Plus :size="28" class="text-white m-3" />
      </button>
    </div>

    <AddModal
      :show="!!addModal"
      :initial-mode="addModal?.mode"
      :preset-category-ids="activeCategoryId ? [activeCategoryId] : []"
      :preset-feed-ids="addModal?.feedIds"
      @close="addModal = null"
    />
    <FeedDetailModal :feed-id="detailFeedId" @close="detailFeedId = null" />
    <CategorizeModal :show="!!categorizeIds" :feed-ids="categorizeIds ?? []" @close="categorizeIds = null" />
    <CategoryEditModal :category="editedCategory" @close="editedCategory = null" />
  </div>
</template>
