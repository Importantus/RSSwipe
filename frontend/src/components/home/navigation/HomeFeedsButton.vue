<script setup lang="ts">
import router from '@/router';
import { Rss } from 'lucide-vue-next';

function openFeedSettings() {
    router.push({ name: 'Feeds' });
}
</script>

<template>
    <button @click="openFeedSettings" title="Your Feed">
        <Rss size="24" class=" text-white" />
    </button>
</template>
