<script setup lang="ts">
function openFeedSettings() {
    console.log("openFeedSettings");
}
import { Rss } from 'lucide-vue-next';
</script>

<template>
    <button @click="openFeedSettings">
        <Rss size="24" class=" text-white" />
    </button>
</template>