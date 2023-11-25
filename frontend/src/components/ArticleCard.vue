<script setup lang="ts">
import ArticleInfoElement from '@/components/ArticleInfoElement.vue';
defineProps<{
    url: string
}>()
</script>

<template>
    <div class="h-full max-h-[32rem] drop-shadow-lg rounded-xl bg-center bg-cover"
        :style="{ backgroundImage: 'url(' + url + ')' }">
        <ArticleInfoElement class="rounded-xl absolute bottom-0" />
    </div>
</template>