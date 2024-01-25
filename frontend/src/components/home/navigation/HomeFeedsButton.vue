<script setup lang="ts">
import router from '@/router';
import { useFeedStore } from '@/stores/feeds';
import { Rss } from 'lucide-vue-next';

function openFeedSettings() {
    router.push({ name: 'Feeds' });
}
const store = useFeedStore();

</script>

<template>
    <button @click="openFeedSettings" title="Your Feed" class="relative error-dot"
        :class="{ 'error-dot-active': store.someFeedHasError() }">
        <Rss size="24" class=" text-white" />
    </button>
</template>