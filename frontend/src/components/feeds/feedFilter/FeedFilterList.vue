<script setup lang="ts">
import FeedFilterItem from '@/components/feeds/feedFilter/FeedFilterItem.vue'
import TextInputField from '@/components/global/TextInputField.vue'
import { useFeedStore } from '@/stores/feeds'
import { Search, X } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BigFeedFilterItem from './BigFeedFilterItem.vue'

const feedStore = useFeedStore()
const showModal = ref(false)
const searchTerm = ref('')

const scrollContainer = ref<HTMLElement | null>(null)

const isScrolledToLeft = ref(true)
const isScrolledToRight = ref(false)
const isNotScrollable = ref(false)

const updateScrollState = () => {
  if (scrollContainer.value) {
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value

    isNotScrollable.value = scrollWidth <= clientWidth
    isScrolledToLeft.value = scrollLeft === 0 || isNotScrollable.value
    isScrolledToRight.value = scrollLeft + clientWidth >= scrollWidth - 1 || isNotScrollable.value // -1 für Toleranz bei Floating Point Werten
  }
}

onMounted(() => {
  feedStore.getFeedList()
  setTimeout(updateScrollState, 0)

  window.addEventListener('resize', updateScrollState)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollState)
})

const leftButtonClasses = computed(() => ({
  'rounded-r-xl': isScrolledToLeft.value || isNotScrollable.value,
  'bg-primary-600': feedStore.filteredFeedList.length === 0,
  'text-white': feedStore.filteredFeedList.length === 0,
  'bg-secondary-900': !(feedStore.filteredFeedList.length === 0),
  'text-secondary-300': !(feedStore.filteredFeedList.length === 0)
}))

const rightButtonClasses = computed(() => ({
  'rounded-l-xl': isScrolledToRight.value || isNotScrollable.value,
  'bg-secondary-900': true,
  'text-secondary-300': true
}))
</script>

<template>
  <div v-if="feedStore.feedList.length > 0" class="flex flex-row gap-2 w-full">
    <button
      :class="leftButtonClasses"
      class="flex flex-row p-2 px-4 rounded-l-xl transition-all duration-150 ease-in"
      @click="feedStore.unselectAll()"
    >
      <div class="align-middle">
        <p class="font-text-detail text-xs" title="All feeds">All</p>
      </div>
    </button>
    <div
      ref="scrollContainer"
      class="flex flex-row gap-2 overflow-x-auto no-scrollbar flex-grow"
      @scroll="updateScrollState"
    >
      <FeedFilterItem v-for="feed in feedStore.feedList" :key="feed.id" :feed="feed" title="Feed" />
    </div>
    <button
      v-if="feedStore.feedList.length > 3"
      :class="rightButtonClasses"
      class="flex flex-row p-2 px-4 rounded-r-xl transition-all duration-150 ease-in"
      @click="showModal = !showModal"
    >
      <div class="align-middle">
        <p class="font-text-detail text-xs" title="All feeds">...</p>
      </div>
    </button>
  </div>
  <Transition name="popup-fade">
    <div
      v-if="showModal"
      class="fixed z-40 top-0 bottom-0 left-0 right-0 h-screen w-screen bg-opacity-60 bg-black flex justify-center items-center"
    >
      <div
        class="w-[90%] max-w-lg bg-secondary-950/90 backdrop-blur-lg rounded-3xl p-5 relative justify-between"
      >
        <X
          class="absolute top-4 right-5 cursor-pointer"
          size="28"
          @click="
            () => {
              showModal = false
              searchTerm = ''
            }
          "
        />
        <h3 class="text-lg font-semibold mb-5 top-5">Select Feeds</h3>
        <TextInputField
          v-focus
          v-model="searchTerm"
          placeholder="Search"
          :icon="Search"
          :required="false"
          class="mb-4"
        />
        <div class="mb-4 w-full flex flex-wrap gap-2">
          <FeedFilterItem
            v-for="feed in feedStore.feedList.filter((f) => feedStore.isFeedSelected(f.id))"
            :key="feed.id"
            :feed="feed"
            title="Feed"
          />
        </div>
        <div
          class="w-full overflow-x-hidden overflow-y-scroll no-scrollbar h-96 flex flex-col gap-2"
        >
          <BigFeedFilterItem
            v-for="feed in feedStore.feedList"
            :key="feed.id"
            :feed="feed"
            title="Feed"
            :searchTerm="searchTerm"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>
