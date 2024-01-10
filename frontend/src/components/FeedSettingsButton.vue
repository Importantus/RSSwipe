<script setup lang="ts">
function openFeedSettings() {
    router.push({ name: 'Feeds' });
}
import router from '@/router';
import { Rss } from 'lucide-vue-next';
</script>

<template>
    <button @click="openFeedSettings" title="Your Feed">
        <Rss size="24" class=" text-white" />
    </button>
</template>