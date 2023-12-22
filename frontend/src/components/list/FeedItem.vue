<script setup lang="ts">
import { defineProps, ref ,computed } from 'vue';
import { userFeedItem } from '@/stores/feeds';
import type { FeedItem } from '@/stores/feeds';

const isDropdownVisible = ref(false);
const isFeedVisible = ref(true);

const dropdownIconStyle = computed(() => ({
  transform: isDropdownVisible.value ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.3s' // Optional: add transition for smooth rotation
}));


const store = userFeedItem();
const props = defineProps<{
    feed: FeedItem
}>()
const toggleDropdown = () => {
  isDropdownVisible.value = !isDropdownVisible.value;
};

const shareFeed = () => {
    navigator.share({
        title: props.feed.title,
        url: props.feed.url
    })
}
//const showAddFeedModal = ref(false)
//const newFeedTitle = ref('');
//const newFeedUrl = ref('');
//function toggleAddFeedPopup() {
//addFeedPopupVisible.value = !addFeedPopupVisible.value;
//}
//function handleAddFeed() { 
//store.addFeed(newFeedTitle.value, newFeedUrl.value);
//toggleAddFeedPopup();
//}

</script>
<template>
    <div class="flex items-center">
        <a href="/" class>
        </a>
        <h2 class="text-white font-semibold truncate">Your Feeds</h2>
    </div>
    <div class="flex justify-between items-center bg-secondary-800 text-white p-5 rounded-lg shadow-md">
        <img class="w-10 h-10" :src="props.feed.faviconUrl" alt="favicon" />

        <div class="flex-grow mx-5">
            <button @click="store.toggleFeed(props.feed.id)" class="w-full">
                {{ props.feed.title }}
            </button>
        </div>

        <div class="w-10 h-10 flex justify-center items-center">
            <img width="20" src="/icons/DownArrow.svg" alt="">
        </div>

        <div v-if="isDropdownVisible" class="rounded-lg bg-secondary-900 ">

            <div class="rounded-lg bg-secondary-900 ">
                <div class="px-4 py-2">
                    <h3>Open in App?</h3>
                </div>
                <div class="flex justify-center items-center">
                    <div class="px-4 text-secondary-500">if the articles of this feed should be opened in the app or an
                        external rab
                    </div>
                    <div class="px 4">
                        <label class="relative inline-flex items-center me-5 cursor-pointer">
                            <input type="checkbox" value="" class="sr-only peer" checked>
                            <div
                                class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 dark:peer-focus:ring-orange-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500">
                            </div>

                        </label>
                    </div>

                </div>
                <div class="flex justify-between py-3 px-3 p-5">
                    <div><button @click="shareFeed()"
                            class=" bg-transparent hover:bg-secondary-500 text-secondary-300 font-semibold hover:text-white py-2 px-4 border border-secondary-500 hover:border-transparent rounded">ShareFeed</button>
                    </div>

                    <div><button @click="store.deleteFeed(feed.id); deleteFeed();"
                            class="bg-transparent hover:bg-secondary-500 text-secondary-300 font-semibold hover:text-white py-2 px-4 border border-secondary-500 hover:border-transparent rounded">DeleteFeed</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex justify-center text-secondary-500 py-4"> Swipe for more options</div>
        <!--<div v-if="showAddFeedModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
<div class="bg-white p-4 rounded-lg shadow-lg">
  <h3 class="text-lg font-semibold mb-4">Add New Feed</h3>
  <input v-model="newFeedTitle" type="text" placeholder="Title" class="p-2 border border-gray-300 rounded mb-2 w-full" />
  <input v-model="newFeedUrl" type="text" placeholder="URL" class="p-2 border border-gray-300 rounded mb-4 w-full" />
  <button @click="handleAddFeed" class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Add Feed</button>
  <button @click="toggleAddFeedPopup" class="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 ml-2">Cancel</button>
</div>
</div>-->
    </div>
    <div class="w-16 h-16  absolute bottom-8 right-0 m-8 py-0"
        @click="store.addFeed(props.feed.url, props.feed.openInApp);">
        <img src="/icons/CircleAdd.svg" alt="">
    </div>
</template>