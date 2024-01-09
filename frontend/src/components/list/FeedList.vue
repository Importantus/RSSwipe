<script setup lang="ts">
import { useFeedStore } from '@/stores/feeds';
import FeedItem from './FeedItem.vue';
import NonBlockingLoadingIndicator from '../NonBlockingLoadingIndicator.vue';
import { StoreStatus } from '@/stores/readingList';

const store = useFeedStore();
store.getFeedList();
</script>
<template>
            <NonBlockingLoadingIndicator :show="store.state === StoreStatus.LOADING" />
            <TransitionGroup name="list" tag="div" class="flex flex-col gap-4 overflow-x-hidden">
            <FeedItem v-for="feed in store.feedList" :key="feed.id" :feed="feed" />
            </TransitionGroup>
        <div v-else class="flex h-3/5 justify-center items-center">
            <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
        </div>
    </div>
</template>
