<script setup lang="ts">
import FeedFilterItem from '@/components/feeds/feedFilter/FeedFilterItem.vue';
import { useFeedStore } from '@/stores/feeds';

const feedStore = useFeedStore()

feedStore.getFeedList()
</script>

<template>
    <div v-if="feedStore.feedList.length > 0" class="flex flex-row gap-2 overflow-scroll no-scrollbar">
        <button class="flex flex-row rounded-xl p-2 px-4 bg-primary-600" @click="feedStore.unselectAll()"
            :class="{ 'bg-primary-600 text-white': feedStore.filteredFeedList.length === 0, 'bg-secondary-900 text-secondary-300': !(feedStore.filteredFeedList.length === 0) }">
            <div class="align-middle">
                <p class="font-text-detail text-xs" title="All feeds">All</p>
            </div>
        </button>
        <FeedFilterItem v-for="feed in feedStore.feedList" :key="feed.id" :feed="feed" title="Feed" />
    </div>
</template>
