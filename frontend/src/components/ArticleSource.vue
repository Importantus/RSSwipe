<template>
    <div class="flex flex-row w-fit rounded-lg p-1 px-2 bg-secondary-900 bg-opacity-60 max-w-[16rem]">
        <div class="w-4 h-4">
            <img :src="article.feed.faviconUrl" alt="favicon" />
        </div>
        <p class="pl-2 font-text-detail font-light text-xs text-opacity-60 truncate ...">{{ article.feed.title }}</p>
    </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

defineProps<{
    article: Article;
}>()
</script>
    

