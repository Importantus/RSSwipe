<script setup lang="ts">
function openFeedSettings() {
    router.push({ name: 'Feeds' });
}
import router from '@/router';
import { Rss } from 'lucide-vue-next';
</script>

<template>
    <button @click="openFeedSettings">
        <Rss size="24" class=" text-white" />
    </button>
</template>