<script setup lang="ts">
import { useFeedStore } from '@/stores/feeds';
import FeedItem from './FeedItem.vue';
import NonBlockingLoadingIndicator from '../NonBlockingLoadingIndicator.vue';
import { StoreStatus } from '@/stores/readingList';

const store = useFeedStore();
store.getFeedList();
</script>
<template>
    <div>
        <div v-if="store.feedList.length > 0">
            <NonBlockingLoadingIndicator :show="store.state === StoreStatus.LOADING" />
            <TransitionGroup name="list" tag="div" class="flex flex-col gap-4 overflow-x-hidden">
                <FeedItem v-for="feed in store.feedList" :key="feed.id" :feed="feed" />
            </TransitionGroup>
        </div>
        <div v-else-if="store.feedList.length === 0 && store.state === StoreStatus.READY">
            <div class="flex w-full items-center justify-center flex-col h-full mt-[20vh]">
                <img src="/images/LovingDoodle.svg" alt="A Person holding a heart in their hands" class="w-[80%]">
                <p class="text-background-600 m-0">No subscribed feeds yet.</p>
            </div>
        </div>
        <div v-else class="flex h-3/5 justify-center items-center">
            <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
        </div>
    </div>
</template>
