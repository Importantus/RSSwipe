<script setup lang="ts">
import FeedFilterItem from '@/components/feeds/feedFilter/FeedFilterItem.vue';
import { useFeedStore } from '@/stores/feeds';
import { onMounted, ref, type Ref } from 'vue';

const feedStore = useFeedStore()

const expanded = ref(false);
const listEl: Ref<HTMLElement | null> = ref(null);
const numberOfInvisibleItems = ref(0);

onMounted(() => {
    const options = {
        root: listEl.value,
        rootMargin: '0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        /* const visibleItemsCount = entries.filter(entry => entry.isIntersecting).length;
        numberOfVisibleItems.value = visibleItemsCount > 0 ? numberOfVisibleItems.value + visibleItemsCount : +(numberOfVisibleItems.value - 1); */
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("k-visible-in-scroll-box");
            } else {
                entry.target.classList.remove("k-visible-in-scroll-box");
            }
        });
        if (numberOfInvisibleItems.value === 0)
            numberOfInvisibleItems.value = feedStore.feedList.length - document.querySelectorAll('.k-visible-in-scroll-box').length;
    }, options);

    setTimeout(() => {
        const items = listEl.value?.children;
        if (!items) return;
        console.log(items);

        for (let i = 0; i < items.length; i++) {
            observer.observe(items[i]);
        }
    }, 1000);
});

feedStore.getFeedList()
</script>

<template>
    <div v-if="feedStore.feedList.length > 0" class="relative h-12 w-full">
        <div class="absolute z-40 py-5 rounded-md w-full" :class="{ 'bg-background-950 shadow-lg gradient': expanded }">

            <div ref="listEl" class="flex flex-row gap-2 overflow-x-scroll no-scrollbar relative"
                :class="{ 'flex-wrap': expanded }">

                <!-- All button -->
                <button class="flex flex-row rounded-xl p-2 px-4 bg-primary-600" @click="feedStore.unselectAll()"
                    :class="{ 'bg-primary-600 text-white': feedStore.filteredFeedList.length === 0, 'bg-secondary-900 text-secondary-300': !(feedStore.filteredFeedList.length === 0) }">
                    <div class="align-middle">
                        <p class="font-text-detail text-xs" title="All feeds">All</p>
                    </div>
                </button>
                <!-- Feed filter items -->
                <FeedFilterItem v-for="feed in feedStore.feedList" :key="feed.id" :feed="feed" title="Feed" />
                <!-- Expand button -->
                <div class="sticky right-0">
                    <button
                        class="flex flex-row rounded-l-xl py-2 px-2 bg-gradient-to-r from-secondary-950 to-background-950 shadow-md"
                        @click="expanded = !expanded">
                        <div class="align-middle">
                            <p class="font-text-detail text-xs" title="Expand">+{{ numberOfInvisibleItems }}</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.gradient {
    background: radial-gradient(circle, rgba(16, 16, 16, 1) 0%, rgba(16, 16, 16, 1) 73%, rgba(16, 16, 16, 0.9626051104035365) 84%, rgba(16, 16, 16, 0.8561625333727241) 100%);
}
</style>
