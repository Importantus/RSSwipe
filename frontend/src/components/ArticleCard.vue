<script setup lang="ts">
import ArticleInfoElement from '@/components/ArticleInfoElement.vue';
import { computed } from 'vue';
const props = defineProps<{
    article: Article;
}>()

const url = computed(() => `"${props.article.imageUrl}"`)

console.log(props.article.imageUrl)
</script>

<template>
    <div class="h-full max-h-[70vh] drop-shadow-lg rounded-xl bg-center bg-cover bg-background-800"
        :style="{ backgroundImage: 'url(' + url + ')' }">
        <ArticleInfoElement :article="props.article" class="rounded-xl absolute bottom-0" />
    </div>
</template>