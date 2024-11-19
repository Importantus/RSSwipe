<script setup lang="ts">
import { useFeedStore } from '@/stores/feeds';
import FeedItem from './FeedPageItem.vue';
import NonBlockingLoadIndicator from '@/components/global/loadingIndicators/NonBlockingLoadIndicator.vue';
import BlockingLoadIndicator from '@/components/global/loadingIndicators/BlockingLoadIndicator.vue';
import { StoreStatus } from '@/stores/readingList';

const store = useFeedStore();
store.getFeedList();
</script>

<template>
  <div style="interpolate-size: allow-keywords;">
    <div v-if="store.feedList.length > 0">
      <NonBlockingLoadIndicator :show="store.state === StoreStatus.LOADING" />
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
    <BlockingLoadIndicator v-else :show="true" />
  </div>
</template>
