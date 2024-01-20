<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useFeedStore } from '@/stores/feeds';
import type { FeedItem } from '@/stores/feeds';
import { ChevronDown } from 'lucide-vue-next';
import { Trash2 } from 'lucide-vue-next';

const props = defineProps<{
    feed: FeedItem;
}>();

const store = useFeedStore();
const showOptions = ref(false);
const templateArr: string[] = [
    "/images/articles/placeholder01.png",
    "/images/articles/placeholder02.png",
    "/images/articles/placeholder03.png",
    "/images/articles/placeholder04.png"
]
const toggleOptions = () => {
    showOptions.value = !showOptions.value;
};

const openInApp = computed({
    get: () => props.feed.openInApp,
    set: () => {
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

const faviconUrl = props.feed.faviconUrl ? props.feed.faviconUrl : templateArr[Math.round((templateArr.length - 1) * Math.random())]

const openFeedPage = () => {
    const baseUrl = new URL(props.feed.url).origin
    window.open(baseUrl, '_blank');
}
</script>

<template>
    <div class="overflow-hidden rounded-lg">
        <div @click="toggleOptions" class="flex items-center text-left cursor-pointer relative z-10">
            <div
                class="flex justify-between bg-[#222] text-white px-4 py-3 rounded-t-lg shadow-md w-full transition items-center gap-3">
                <div class="w-10 h-10 flex-shrink-0 overflow-hidden rounded">
                    <img class="min-w-full min-h-full object-cover" :src="faviconUrl" alt="favicon" />
                </div>
                <div class="flex flex-col w-full overflow-hidden">
                    <div class="text-lg font-semibold truncate block max-w-full">
                        {{ props.feed.title }}
                    </div>
                    <div class="truncate block max-w-full text-background-500 text-sm">{{ props.feed.url }}</div>
                </div>
                <div class="flex items-center flex-shrink-0 aspect-square" title="open Feed Option">
                    <ChevronDown :stroke-width="1.25" size="35" class="transition" :class="{ 'rotate-180': showOptions }" />
                </div>
            </div>
        </div>
        <Transition name="slide-fade">
            <div v-if="showOptions" class="px-4 py-4 rounded-lg bg-[#282828] flex flex-col gap-4 z-0"
                :class="{ 'rounded-t-none': showOptions }">
                <div class="flex justify-between items-center gap-2">
                    <div>
                        <h3 class="font-semibold">Open in App?</h3>
                        <p class="text-secondary-500 text-left font-thin text-sm">Should Feed Articles Open In App?
                        </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer" title="open Feed with App">
                        <input type="checkbox" class="sr-only peer" v-model="openInApp">
                        <div class="w-11 h-6 bg-primary-600 rounded-full peer dark:bg-background-900  dark:peer-focus:ring-orange-00 peer-checked:after:translate-x-full 
                                        rtl:peer-checked:after:-translate-x-full peer-checked:after:border-primary-600 after:content-[''] after:absolute after:top-0.5 
                                        after:start-[2px] after:bg-primary-600 after:border-primary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                                        dark:border-background-900  peer-checked:bg-primary-800">
                        </div>
                    </label>
                </div>
                <div class="flex gap-3">
                    <button v-if="canShare" @click="shareFeed();" title="share Feed"
                        class=" w-full h-11 bg-primary-600 rounded-lg hover:bg-amber-700 transition">Share</button>
                    <button @click="openFeedPage();" title="open Feed with new Tap"
                        class=" w-full h-11 bg-primary-600 rounded-lg hover:bg-amber-700 transition">Open</button>
                    <button @click="store.deleteFeed(props.feed.id)" title="remove"
                        class="w-11 h-11 flex-shrink-0 bg-black/30 rounded-lg hover:bg-red-900 transition flex justify-center items-center">
                        <Trash2 size="20" class="text-background-300" />
                    </button>
                </div>
            </div>
        </Transition>
    </div>
</template>
