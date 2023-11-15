<script setup lang="ts">
import { VueElement, ref, getCurrentInstance } from 'vue';
defineProps<{
    favicon: string
    title: string
}>()

function selectFeedItem() {
    console.log("selectFeedItem");
}
</script>

<template>
    <button class="flex flex-row rounded-xl p-2 px-3 bg-secondary mx-1" @click="selectFeedItem">
        <div class=" align-middle w-4 h-4">
            <img :src="favicon" alt="favicon" />
        </div>
        <div class="align-middle pl-3">
            <p class="font-text-small text-xs text-opacity-60">{{ title }}</p>
        </div>
    </button>
</template>