<script setup lang="ts">
import router from '@/router';
import { useFeedStore } from '@/stores/feeds';
import { Rss } from 'lucide-vue-next';
import { ref } from 'vue';

function openFeedSettings() {
    router.push({ name: 'Feeds' });
}
const store = useFeedStore();

let someFeedHasError = ref<boolean>(store.someFeedHasError());
</script>

<template>
    <button @click="openFeedSettings" title="Your Feed" class="relative error-dot"
        :class="{ 'error-dot-active': someFeedHasError }">
        <Rss size="24" class=" text-white" />
    </button>
</template>