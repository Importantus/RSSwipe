<script setup lang="ts">
defineProps<{
    favicon: string
    title: string
}>()

function selectFeedItem() {
    console.log("selectFeedItem");
}
</script>

<template>
    <button class="flex flex-row rounded-xl p-2 px-3 bg-secondary-900" @click="selectFeedItem">
        <div class=" align-middle w-4 h-4">
            <img :src="favicon" alt="favicon" />
        </div>
        <div class="align-middle pl-3">
            <p class="w-10 font-text-detail text-xs text-opacity-60 truncate ...">{{ title }}</p>
        </div>
    </button>
</template>