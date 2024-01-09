<script setup lang="ts">
import { useStartPageStore, ArticleStatus } from '@/stores/startPage';
import ArticleCard from '../ArticleCard.vue';
import { onMounted } from 'vue';
import NonBlockingLoadingIndicator from '../NonBlockingLoadingIndicator.vue';

const store = useStartPageStore();

onMounted(async () => {
    await store.fetchArticles();
});
</script>

<template>
    <div v-if="store.status === ArticleStatus.READY || store.articles.length > 0" class="grid">
        <NonBlockingLoadingIndicator :show="store.status === ArticleStatus.LOADING" />
        <ArticleCard class="col-start-1 row-start-1" v-for="(article, index) in store.articles.slice(0, 3).reverse()"
            :key="article.id" :index="Math.min(store.articles.length - 1, 2) - index" :article="article" />
    </div>
    <div v-else-if="store.status === ArticleStatus.LOADING && store.articles.length === 0"
        class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
    </div>
    <div v-else-if="store.status === ArticleStatus.ERROR" class="flex items-center justify-center">
        <p class="text-red-500">Error</p>
    </div>
    <div v-else-if="store.status === ArticleStatus.OUT_OF_ARTICLES" class="flex items-center justify-center flex-col">
        <img src="/images/MeditatingDoodle.svg" alt="Reading" class="w-[60%]" />
        <h2 class="text-secondary-500">All caught up</h2>
    </div>
    <div v-else class="flex items-center justify-center">
        <p class="text-red-500">Unknown error</p>
    </div>
</template>
