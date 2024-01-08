<script setup lang="ts">
import { useFeedStore } from '@/stores/feeds';
import FeedItem from './FeedItem.vue';

const store = useFeedStore();
store.getFeedList();
</script>
<template>
    <div class="container  p-4 overflow-y-scroll">
        <div class="space-y-4">
            <FeedItem v-for="feed in store.feedList" :key="feed.id" :feed="feed" />
        </div>
    </div>
</template>
