<script setup lang="ts">
import { useFeedStore } from '@/stores/feeds';
import type { Article } from '@/types';
import { ref } from 'vue';
import { X } from 'lucide-vue-next';

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
                <img :src="article.feed.faviconUrl" alt="favicon" />
            </div>
            <p class="font-text-detail font-light text-xs text-opacity-60 truncate ...">{{ article.feed.title }}</p>

        </div>
        <Transition name="popup-fade">
            <div v-if="showMoreInformation"
                class="fixed z-40 top-0 bottom-0 left-0 right-0 h-screen w-screen bg-opacity-40 bg-black flex justify-center items-center">
                <div class="w-[90%] max-w-lg bg-background-950 rounded-xl p-5 relative">
                    <X class="absolute top-5 right-5 cursor-pointer" size="32" @click="showMoreInformation = false" />
                    <div class="flex flex-row gap-2 items-center text-lg">
                        <div v-if="article.feed.faviconUrl" class="w-6 h-6 mr-2 flex items-center justify-center">
                            <img :src="article.feed.faviconUrl" alt="favicon" />
                        </div>
                        {{ article.feed.title }}
                    </div>
                    <div class="mt-1 opacity-60">{{ article.feed.link }}</div>
                    <div class="mt-5">
                        <button v-if="!feedStore.isSubscribed(article.feed.id)"
                            @click="feedStore.addFeed(article.feed.link, true);" title="subscribe to feed"
                            class=" w-full h-11 bg-primary-600 rounded-lg hover:bg-amber-700 transition">Subscribe</button>
                        <button v-else @click="feedStore.deleteFeed(article.feed.id)" title="unsubscribe from feed"
                            class=" w-full h-11 bg-red-600 rounded-lg hover:bg-red-700 transition">Unsubscribe</button>
                    </div>

                </div>
            </div>
        </Transition>
    </div>
</template>
