<template>
    <div class="flex flex-row w-fit rounded-md p-1 px-2 bg-secondary-900 bg-opacity-60 max-w-[16rem]">
        <div v-if="article.feed.faviconUrl" class="w-4 h-4 mr-2 flex items-center justify-center">
            <img :src="article.feed.faviconUrl" alt="favicon" />
        </div>
        <p class="font-text-detail font-light text-xs text-opacity-60 truncate ...">{{ article.feed.title }}</p>
    </div>
</template>

<script setup lang="ts">
import type { Article } from '@/types';
import { defineProps } from 'vue';

defineProps<{
    article: Article;
}>()
</script>
    

