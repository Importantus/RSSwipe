<script setup lang="ts">
import { computed, defineProps, ref, onMounted } from 'vue';
import { userFeedItem } from '@/stores/feeds';
import type { FeedItem } from '@/stores/feeds';
import { ChevronDown } from 'lucide-vue-next';

const store = userFeedItem();
const showOptions = ref(false);
const props = defineProps<{
    feed: FeedItem;
}>();
const toggleOptions = () => {
    showOptions.value = !showOptions.value;
};
const openInApp = computed({
    get: () => props.feed.openInApp,
    set: (value) => {

        store.toggleOpenInApp(props.feed.id)
    }
})
const shareFeed = () => {
    navigator.share({
        title: props.feed.title,
        url: props.feed.url,
    });
};
let canShare = ref(false);

onMounted(async () => {
    try {
        navigator.canShare();
        canShare.value = true;
    } catch (error) {
        canShare.value = false;
    }
});
</script>

<template>
    <div>
        <div @click="toggleOptions" class="flex items-center text-left cursor-pointer">
            <div v-if="props.feed.faviconUrl"
                class="flex justify-between  bg-secondary-800/50 text-white p-4 rounded-lg shadow-md w-full px-4 "
                :class="{ 'rounded-b-none': showOptions }">
                <img class="w-10 h-10 me-auto" :src="props.feed.faviconUrl" alt="favicon" />
                <div class="flex-grow flex justify-center items-center mx-2">
                    <button  class=" font-semibold ">
                        {{ props.feed.title }}
                    </button>
                </div>
                <div  class="flex items-center  me-auto ">
                    <ChevronDown :stroke-width="1.25"  size="35" class="{ active: isActive } rounded"
                        :class="{ 'rotate-180': showOptions }" />
                </div>
            </div>
        </div>
        <Transition name="slide-fade">
            <div v-if="showOptions" class=" rounded-lg bg-secondary-900/75 " :class="{ 'rounded-t-none': showOptions }">
                <div class="px-4 py-2">
                    <div class="rounded-lg">
                        <div class="px-1 py-2">
                            <h3>Open in App?</h3>
                        </div>
                        <div class="flex  justify-between  ">
                            <div class="px-1 text-secondary-500 text-left">Should Feed Articles Open In App?
                            </div>
                            <div class=" px-auto py-1">
                                <label class="relative inline-flex items-center me-1 cursor-pointer">
                                    <input type="checkbox" class="sr-only peer" v-model="openInApp">
                                    <div
                                        class="w-11 h-6 bg-primary-500 rounded-full peer dark:bg-background-900  dark:peer-focus:ring-orange-00 peer-checked:after:translate-x-full 
                                        rtl:peer-checked:after:-translate-x-full peer-checked:after:border-primary-500 after:content-[''] after:absolute after:top-0.5 
                                        after:start-[2px] after:bg-primary-500 after:border-primary-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                                         dark:border-background-900  peer-checked:bg-primary-700">
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div class="flex justify-between py-3 px-1  space-x-2 ">
                            <div v-if="canShare" class="flex-1">
                                <button  @click="shareFeed();"
                                    class=" w-full h-11 border-amber-600 border-solid border-2 rounded-lg hover:bg-amber-700 transition py-2 px-20 mr-1 ">Share</button>
                            </div>
                            <div class="flex-1">
                                <button @click="store.deleteFeed(props.feed.id)"
                                    class="w-full h-11 bg-red-500 rounded-lg hover:bg-red-600 transition py-2 px-20">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
<style scoped>

</style>