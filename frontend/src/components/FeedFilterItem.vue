<script setup lang="ts">
const props = defineProps<{
    favicon: string
    title: string
    noTruncate?: boolean
}>()

const noTruncate = props.noTruncate

function selectFeedItem() {
    console.log("selectFeedItem");
}
</script>

<template>
    <button class="flex flex-row rounded-xl p-2 px-3 bg-secondary-900" @click="selectFeedItem">
        <div class="align-middle w-4 h-4">
            <img :src="favicon" alt="favicon" />
        </div>
        <div class="align-middle pl-3">
            <p class="font-text-detail text-xs text-opacity-60 " :class="{ 'w-10 truncate ...': !noTruncate }">
                {{
                    title }}</p>
        </div>
    </button>
</template>