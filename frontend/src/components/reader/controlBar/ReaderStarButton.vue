<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { computed } from 'vue';
import { useReaderStore } from '@/stores/reader';

const store = useReaderStore()

const starred = computed(() => !!store.storedArticles[0]?.articleInfo.starred);

function toggleStar() {
    const article = store.storedArticles[0]?.articleInfo;
    if (!article) return;
    store.setArticleStarred(article, !starred.value);
}
</script>

<template>
    <button class="" @click="toggleStar">
        <Star size="28" class="m-3 active:transform active:scale-125 transition-all ease-out duration-200 
             active:bg-opacity-20 active:bg-primary-600 w-fit rounded-full"
            :class="{ 'fill-primary-600 text-primary-600': starred, 'text-primary-600': !starred }" />
    </button>
</template>
