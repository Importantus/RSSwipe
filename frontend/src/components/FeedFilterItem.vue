<script setup lang="ts">
import { useFeedStore, type FeedItem } from '@/stores/feeds';

const props = defineProps<{
    feed: FeedItem
    noTruncate?: boolean
}>()

const feedStore = useFeedStore()

</script>

<template>
    <button class="flex flex-row rounded-xl p-2 px-3 gap-3" @click="feedStore.toggleFeed(props.feed.id)"
        :class="{ 'bg-primary-600 text-white': feedStore.isFeedSelected(props.feed.id), 'bg-secondary-900 text-secondary-300': !feedStore.isFeedSelected(props.feed.id) }">
        <div v-if="props.feed.faviconUrl" class="align-middle w-4 h-4">
            <img :src="props.feed.faviconUrl" alt="favicon" />
        </div>
        <div class="align-middle">
            <p class="font-text-detail text-xs text-opacity-60 line-clamp-1"
                :class="{ 'w-16 truncate block': !props.noTruncate }">
                {{ props.feed.title }}</p>
        </div>
    </button>
</template>