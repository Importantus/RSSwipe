<script setup lang="ts">
import HomeDiscardButton from './HomeDiscardButton.vue';
import HomeSaveButton from './HomeSaveButton.vue';
import HomeReadingListButton from './HomeReadingListButton.vue';
import { useHomeStore } from '@/stores/home';
import { computed } from 'vue';

const store = useHomeStore();

const showButtons = computed(() => {
    return store.articles.length > 0 && !(store.swipeLimit.active && store.swipeLimit.swipes >= store.swipeLimit.swipeLimit + store.swipeLimit.overSwipes);
});
</script>

<template>
    <div>
        <div class="mb-0 flex flex-row items-center justify-between gap-2 bg-secondary-900 rounded-[30px] w-fit m-auto p-4 transition-width ease-out duration-1000"
            :class="{ 'px-5': !showButtons, 'px-7': showButtons }">
            <Transition name="discardbutton">
                <HomeDiscardButton v-if="showButtons" :style="{
                    'transform': 'scale(' + (store.swipeLeftPercentage * 0.5 + 100) + '%)',
                    'z-index': store.swipeLeftPercentage > 0 ? 1000 : 0
                }" class="transition all duration-300" />
            </Transition>
            <HomeReadingListButton />
            <Transition name="savebutton">
                <HomeSaveButton v-if="showButtons" :style="{
                    'transform': 'scale(' + (store.swipeRightPercentage * 0.5 + 100) + '%)',
                    'z-index': store.swipeRightPercentage > 0 ? 1000 : 0
                }" class="transition all duration-300" />
            </Transition>
        </div>
    </div>
</template>
