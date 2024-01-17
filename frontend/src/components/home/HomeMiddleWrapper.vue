<script setup lang="ts">
import { useStartPageStore, ArticleStatus } from '@/stores/startPage';
import ArticleCard from '../ArticleCard.vue';
import { onMounted } from 'vue';
import NonBlockingLoadingIndicator from '../NonBlockingLoadingIndicator.vue';
import { Rss, RotateCcw } from 'lucide-vue-next';
import { useFeedStore } from '@/stores/feeds';
import router from '@/router';

const store = useStartPageStore();
const feedStore = useFeedStore();

onMounted(async () => {
    await store.fetchArticles();
    await store.updateSwipeLimit();
});
</script>

<template>
    <div v-if="store.status === ArticleStatus.READY || store.articles.length > 0" class="h-full flex flex-col relative">
        <NonBlockingLoadingIndicator :show="store.status === ArticleStatus.LOADING" />
        <Transition name="fade">
            <div v-if="store.swipeLimit.active && store.swipeLimit.swipes >= store.swipeLimit.swipeLimit + store.swipeLimit.overSwipes"
                class="absolute bottom-0 top-0 left-0 right-0 w-full h-full rounded-xl bg-background-950 backdrop-blur bg-opacity-50 z-50 flex justify-center items-center">
                <div class="flex flex-col bg-background-900 w-3/4 p-5 rounded-lg gap-3">
                    <div>
                        <h2 class="pb-2">
                            Swipe Limit Reached
                        </h2>
                        <p class="text-sm font-light text-background-200">
                            You have reached your swipe limit for today. Have fun reading the articles you have already
                            swiped.
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <div @click="store.addOverSwipes()"
                            class="bg-primary-600 px-5 py-2 rounded-lg cursor-pointer w-full flex justify-center font-semibold hover:bg-amber-700 transition active:bg-primary-500">
                            +5 Swipes
                        </div>
                        <router-link to="readinglist"
                            class="bg-primary-800 px-5 py-2 rounded-lg cursor-pointer w-full flex justify-center font-semibold hover:bg-amber-900 transition active:bg-primary-500">
                            Readinglist
                        </router-link>
                    </div>
                </div>
            </div>
        </Transition>
        <div v-if="store.swipeLimit.active" class="flex flex-col mb-3 bg-white/10 rounded-xl py-2 px-3 gap-1 flex-grow-0">
            <div v-if="store.swipeLimit.overSwipes == 0">
                <div class="text-sm text-background-300 pb-1">
                    Your Swipe Limit: {{ store.swipeLimit.swipes }} / {{ store.swipeLimit.swipeLimit }}
                </div>
                <div class="w-full h-2 overflow-hidden bg-background-900  rounded-full">
                    <div class="bg-primary-600 transition-all duration-500 h-full" :style="{
                        width: (store.swipeLimit.swipes / store.swipeLimit.swipeLimit) * 100 + '%'
                    }">
                    </div>
                </div>
            </div>
            <div v-if="store.swipeLimit.overSwipes > 0">
                <div class="text-sm text-background-300 pb-1">
                    Your Swipe Limit: {{ store.swipeLimit.swipes }} / {{ store.swipeLimit.swipeLimit }} (+{{
                        store.swipeLimit.overSwipes }} Extra Swipes)
                </div>
                <div class="w-full h-2 overflow-hidden bg-background-900  rounded-full">
                    <div class="bg-primary-600 transition-all duration-500 h-full" :style="{
                        width: (store.swipeLimit.swipes / (store.swipeLimit.swipeLimit + store.swipeLimit.overSwipes)) * 100 + '%'
                    }">
                    </div>
                </div>
            </div>
        </div>
        <div class="relative w-full h-full">
            <ArticleCard v-for="(article, index) in store.articles.slice(0, 3).reverse()" :key="article.id"
                :index="Math.min(store.articles.length - 1, 2) - index" :article="article" />
        </div>
    </div>
    <div v-else-if="store.status === ArticleStatus.LOADING && store.articles.length === 0"
        class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
    </div>
    <div v-else-if="store.status === ArticleStatus.ERROR" class="flex items-center justify-center">
        <p class="text-red-500">Error</p>
    </div>
    <div v-else-if="store.status === ArticleStatus.OUT_OF_ARTICLES" class="flex items-center justify-center flex-col">
        <div v-if="feedStore.feedList.length > 0" class="w-full flex justify-center flex-col items-center">
            <img src="/images/MeditatingDoodle.svg" alt="Reading" class="w-[60%]" />
            <h2 class="text-secondary-500">All caught up</h2>
            <button class="p-5" @click="store.fetchArticles()">
                <RotateCcw></RotateCcw>
            </button>
        </div>
        <div v-else class="w-full flex justify-center flex-col items-center">
            <img src="/images/ReadingDoodle.svg" alt="Reading" class="w-[80%]" />
            <button @click="router.push({
                name: 'Feeds'
            })" v-if="feedStore.feedList.length === 0"
                class="flex items-center px-5 py-2 bg-primary-600 rounded-lg gap-2 mt-5 cursor-pointer font-semibold">
                <Rss class="white" :size="20" />
                Add your first feed
            </button>
        </div>
    </div>
    <div v-else class="flex items-center justify-center">
        <p class="text-red-500">Unknown error</p>
    </div>
</template>
