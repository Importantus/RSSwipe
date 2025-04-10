<script setup lang="ts">
import { useFeedStore } from '@/stores/feeds';
import type { Article } from '@/types';
import { ref } from 'vue';
import { X } from 'lucide-vue-next';
import FeedDescription from './feedPage/FeedDescription.vue';
import FeedFavicon from '../global/FeedFavicon.vue';

defineProps<{
    article: Article;
}>()

const showMoreInformation = ref(false)

const feedStore = useFeedStore();

</script>

<template>
    <div>
        <div class="flex flex-row w-fit rounded-md p-2 items-center cursor-pointer bg-secondary-900 bg-opacity-60 max-w-[16rem]"
            @click="showMoreInformation = true">
            <div v-if="article.feed.faviconUrl" class="w-4 h-4 mr-2 flex items-center justify-center">
                <FeedFavicon :url="article.feed.faviconUrl"></FeedFavicon>
            </div>
            <p class="font-text-detail font-light text-xs text-opacity-60 truncate ...">{{ article.feed.title }}</p>

        </div>
        <Transition name="popup-fade">
            <div v-if="showMoreInformation"
                class="h-screen flex flex-row items-center justify-center absolute top-0 bottom-0 right-0 left-0">
                <div class="backdrop-blur-sm absolute top-0 bottom-0 right-0 left-0 bg-opacity-40 bg-black z-30"
                    @click="showMoreInformation = false"></div>
                <div class="fixed z-40 flex justify-center items-center max-w-lg">
                    <div class="bg-background-950 rounded-xl p-5 relative flex flex-col gap-4 ">
                        <div>
                            <div class="flex flex-row gap-2 items-center text-lg">
                                <div v-if="article.feed.faviconUrl"
                                    class="w-6 h-6 mr-2 flex items-center justify-center">
                                    <FeedFavicon :url="article.feed.faviconUrl"></FeedFavicon>
                                </div>
                                <p class="truncate w-full">{{ article.feed.title }}</p>
                                <X class="top-5 right-5 cursor-pointer" size="32"
                                    @click="showMoreInformation = false" />

                            </div>
                            <div class="mt-1 opacity-60">{{ article.feed.link }}</div>
                        </div>
                        <FeedDescription v-if="article.feed.description" :description="article.feed.description">
                        </FeedDescription>
                        <div>
                            <button v-if="!feedStore.isSubscribed(article.feed.id)"
                                @click="feedStore.addFeed(article.feed.link, true);" title="subscribe to feed"
                                class=" w-full h-11 bg-primary-600 rounded-lg hover:bg-amber-700 transition">Subscribe</button>
                            <button v-else @click="feedStore.deleteFeed(article.feed.id)" title="unsubscribe from feed"
                                class=" w-full h-11 bg-red-600 rounded-lg hover:bg-red-700 transition">Unsubscribe</button>
                        </div>

                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
