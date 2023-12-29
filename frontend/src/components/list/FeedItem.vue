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
    
    <div>
        <div class="flex items-center text-center ">
            <div class="flex justify-between items-center bg-secondary-800 text-white p-5 rounded-t-lg shadow-md w-full ">

                <img class="w-10 h-10 mr-4" :src="props.feed.faviconUrl" alt="favicon" />
                <div class="flex-grow mx-5">
                    <button @click="toggleOptions" class="text-center">
                        {{ props.feed.title }}
                        <br>
                        <span class=" feed-item ml-2 text-xs text-secondary-500  items-center">(~34 Articles per day)</span> 
                    </button>
                </div>
                <div class="flex items-center ml-auto ">
                    <ChevronDown @click="toggleOptions" size="35" class="{ active: isActive }" :class="{ 'rotate-180': showOptions }" />
                </div>
            </div>
        </div>

        <div v-if="showOptions" class=" rounded-b-lg bg-secondary-900 ">
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
                </div>

            </div>
        </div>
    </div>
    




    
</template>
