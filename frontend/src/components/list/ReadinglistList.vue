<script setup lang="ts">
import { StoreStatus, useReadingListStore } from '@/stores/readingList';
import ReadinglistItem from './ReadinglistItem.vue';

const store = useReadingListStore();

store.update();
</script>

<template>
    <div>
        <div v-if="store.status === StoreStatus.LOADING" class="w-full h-2 fixed top-0 left-0 animated-gradient">
        </div>
        <div v-if="store.articles.length === 0" class="flex w-full items-center justify-center flex-col h-full mt-[20vh]">
            <img src="/images/LayingDoodle.svg" alt="Person laying on the ground and scrolling trough their phone"
                class="w-[80%]">
            <p class="text-background-600 m-0">Nothing to read yet.</p>
        </div>
        <div v-else>
            <TransitionGroup name="list" tag="div" class="flex flex-col gap-3">
                <ReadinglistItem v-for="article in store.articles" :key="article.articleInfo.id"
                    :article="article.articleInfo" @swipe-right="store.removeArticle(article.articleInfo)"
                    :downloaded="article.content !== undefined" :swipe-right="store.swipeRight"
                    :swipe-left="store.swipeLeft" />
            </TransitionGroup>
        </div>
    </div>
</template>

<style scoped>
.animated-gradient {
    background: linear-gradient(270deg, #CF6A31 0%, #4E2915 50%, #CF6A31 50%, #4E2915 100%);
    background-size: 200% 100%;
    animation: gradient 1s ease infinite;
}

@keyframes gradient {
    0% {
        background-position: 100% 0%;
    }

    100% {
        background-position: 0% 0%;
    }
}
</style>