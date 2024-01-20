<script setup lang="ts">
import type { Article } from '@/types';
import FeedLabel from '@/components/feeds/FeedLabel.vue';

defineProps<{
    article: Article;
}>()
</script>

<template>
    <div class="flex flex-col w-full p-4 gap-1 bg-gradient-to-t from-black to-transparent">
        <FeedLabel :article="article" />
        <div>
            <h2 class="text-2xl max-w-full break-words">{{ article.title }}</h2>
        </div>
    </div>
</template>
