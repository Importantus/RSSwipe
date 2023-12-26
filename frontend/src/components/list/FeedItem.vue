<script setup lang="ts">
import { defineProps,ref} from 'vue';
import { userFeedItem } from '@/stores/feeds';
import type { FeedItem } from '@/stores/feeds';
import { ChevronDown } from 'lucide-vue-next';
import { ChevronLeft } from 'lucide-vue-next';
import TitleNavigationBar from '@/components/TitleNavigationBar.vue'




const store = userFeedItem();
const showOptions = ref(false);
const props = defineProps<{
    feed: FeedItem;
}>();
 
const toggleOptions = () => {
    showOptions.value = !showOptions.value;
};

const shareFeed = () => {
    navigator.share({
        title: props.feed.title,
        url: props.feed.url,
    });
};
</script>


<template>
    <div class="flex  items-center ">
        
        <TitleNavigationBar title="" backHomePath="/" />
        <ChevronLeft size="28"/>
        <h1 class="font-semibold">Your Feeds</h1>
    </div>


    <div>
        <div class="flex items-center ">
            <div class="flex justify-between items-center bg-secondary-800 text-white p-5 rounded-lg shadow-md">

                <img class="w-10 h-10 mr-4" :src="props.feed.faviconUrl" alt="favicon" />
                <div class="flex-grow mx-5">
                    <button @click="store.toggleFeed(props.feed.id)" class="text-center">
                        {{ props.feed.title }}
                        <span class="ml-2 text-xs text-secondary-500">(~34 Articles per day)</span>
                    </button>
                </div>
                <div class="flex items-center ml-auto">
                    <ChevronDown @click="toggleOptions" size="35" class="{ active: isActive }" :class="{ 'rotate-180': showOptions }" />
                </div>
            </div>
        </div>

        <div v-if="showOptions" class="rounded-lg bg-secondary-900 ">
            <div class="px-4 py-2">

                <div class="rounded-lg bg-secondary-900 ">
                    <div class="px-4 py-2">
                        <h3>Open in App?</h3>
                    </div>
                    <div class="flex justify-center items-center">
                        <div class="px-4 text-secondary-500">if the articles of this feed should be opened in the app or an
                            external tab
                        </div>
                        <div class="px 4">
                            <label class="relative inline-flex items-center me-3 cursor-pointer">
                                <input type="checkbox" value="" class="sr-only peer" checked>
                                <div
                                    class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 dark:peer-focus:ring-orange-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500">
                                </div>

                            </label>
                        </div>


                    </div>
                </div>
                <div class="flex justify-between py-3 px-3 p-5">
                    <div><button @click="store.deleteFeed(props.feed.id)"
                            class=" bg-transparent hover:bg-secondary-500 text-secondary-300 font-semibold hover:text-white py-2 px-20 border border-scondary-500  hover:border-transparent rounded-lg">Delete</button>
                    </div>

                    <div><button @click="shareFeed();"
                            class="bg-transparent hover:bg-secondary-500 text-secondary-300 font-semibold hover:text-white py-2 px-20 border border-scondary-500 rounded-lg">Share</button>
                    </div>
                    <div @click="store.toggleFeed(feed.id)"
                        class="fixed inset-0  bg-opacity-50 z-10 flex justify-center items-center">
                        <div class="max-w-sm">


                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>
    <div class="flex justify-center text-secondary-500 py-4"> Swipe for more options</div>




    
</template>
