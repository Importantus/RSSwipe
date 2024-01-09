<script setup lang="ts">
import { StoreStatus, useReadingListStore } from '@/stores/readingList';
import ReadinglistItem from './ReadinglistItem.vue';
import NonBlockingLoadingIndicator from '../NonBlockingLoadingIndicator.vue';

const store = useReadingListStore();

store.update();
</script>

<template>
    <div>
        <NonBlockingLoadingIndicator :show="store.status === StoreStatus.LOADING" />
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

