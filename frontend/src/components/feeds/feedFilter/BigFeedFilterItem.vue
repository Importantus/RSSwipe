<script setup lang="ts">
import { useFeedStore, type FeedItem } from '@/stores/feeds'

const props = defineProps<{
  feed: FeedItem
  searchTerm?: string
}>()

const feedStore = useFeedStore()
</script>

<template>
  <button
    v-if="
      !props.searchTerm || props.feed.title.toLowerCase().includes(props.searchTerm.toLowerCase())
    "
    class="flex flex-row rounded-xl p-3 gap-3 w-full items-center"
    @click="feedStore.toggleFeed(props.feed.id)"
    :class="{
      'bg-primary-600 text-white': feedStore.isFeedSelected(props.feed.id),
      'bg-secondary-900 text-secondary-300': !feedStore.isFeedSelected(props.feed.id)
    }"
  >
    <div v-if="props.feed.faviconUrl" class="align-middle w-4 h-4 overflow-hidden">
      <img :src="props.feed.faviconUrl" alt="favicon" />
    </div>
    <div class="align-middle">
      <p class="font-text-detail text-opacity-60 line-clamp-1">
        {{ props.feed.title }}
      </p>
    </div>
  </button>
</template>
