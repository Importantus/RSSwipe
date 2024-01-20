<script setup lang="ts">
import { onMounted } from 'vue';
import router from '@/router';
import { useFeedStore } from '@/stores/feeds';
import { useHomeStore, ArticleStatus } from '@/stores/home';
import ArticleCard from '@/components/articles/ArticleCard.vue';
import NonBlockingLoadIndicator from '@/components/global/loadingIndicators/NonBlockingLoadIndicator.vue';
import BlockingLoadIndicator from '@/components/global/loadingIndicators/BlockingLoadIndicator.vue';
import HomeControlBar from '@/components/home/controlBar/HomeControlBar.vue';
import HomeUndoButton from '@/components/home/navigation/HomeUndoButton.vue';
import HomeFeedsButton from '@/components/home/navigation/HomeFeedsButton.vue';
import HomeGreetingLabel from '@/components/home/HomeGreetingLabel.vue';
import HomeSettingsButton from '@/components/home/navigation/HomeSettingsButton.vue';
import FeedFilterList from '@/components/feeds/feedFilter/FeedFilterList.vue';
import CategoryList from '@/components/categories/CategoryList.vue';
import { Rss, RotateCcw } from 'lucide-vue-next';

const store = useHomeStore()
const feedStore = useFeedStore();

onMounted(async () => {
  await store.fetchArticles();
  await store.updateSwipeLimit();
});

</script>

<template>
  <div class="flex flex-col gradient h-full px-5 pt-5 gap-5">
    <div class="flex flex-col">
      <div class="flex flex-row items-center">
        <HomeSettingsButton class="flex-none basis 1/4" />
        <HomeGreetingLabel class="flex-1 basis 2/4" />
        <HomeFeedsButton class="flex-none basis 1/4" />
      </div>
      <div class="mt-5 flex flex-col gap-2">
        <CategoryList />
        <FeedFilterList />
      </div>
    </div>
    <div v-if="store.status === ArticleStatus.READY || store.articles.length > 0" class="h-full flex flex-col relative">
      <NonBlockingLoadIndicator :show="store.status === ArticleStatus.LOADING" />
      <Transition name="fade">
        <div
          v-if="store.swipeLimit.active && store.swipeLimit.swipes >= store.swipeLimit.swipeLimit + store.swipeLimit.overSwipes"
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
    <BlockingLoadIndicator v-else-if="store.status === ArticleStatus.LOADING && store.articles.length === 0" :show="true"
      class="h-full" />
    <div v-else-if="store.status === ArticleStatus.ERROR" class="flex items-center justify-center h-full">
      <p class="text-red-500">Error</p>
    </div>
    <div v-else-if="store.status === ArticleStatus.OUT_OF_ARTICLES"
      class="flex items-center justify-center flex-col h-full">
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
    <div v-else class="flex items-center justify-center h-full">
      <p class="text-red-500">Unknown error</p>
    </div>
    <div class="mb-10 mt-4 relative">
      <HomeControlBar />
      <HomeUndoButton v-if="store.lastActions.length > 0" class="absolute right-5 m-auto top-0 bottom-0" />
    </div>
  </div>
</template>

<style scoped>
.gradient {
  background: radial-gradient(114.56% 50% at 50% 50%, #3d3d3d 0%, #101010 81.77%);
}
</style>
