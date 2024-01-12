<script setup lang="ts">
import DiscardArticleButton from '@/components/DiscardArticleButton.vue';
import SaveArticleButton from '@/components/SaveArticleButton.vue';
import ReadingListButton from '@/components/ReadingListButton.vue';
import { useStartPageStore } from '@/stores/startPage';
import { watch } from 'vue';

const store = useStartPageStore();

watch(() => store.swipeLeftPercentage, (newValue) => {
    console.log(newValue);
});
</script>

<template>
    <div>

        <div class="mb-0 flex flex-row items-center justify-between gap-2 bg-secondary-900 rounded-[30px] w-fit m-auto p-4 transition-width ease-out duration-1000"
            :class="{ 'px-5': store.articles.length === 0, 'px-7': store.articles.length > 0 }">
            <Transition name="discardbutton">
                <DiscardArticleButton v-if="store.articles.length > 0" :style="{
                    'transform': 'scale(' + (store.swipeLeftPercentage * 0.5 + 100) + '%)',
                    'z-index': store.swipeLeftPercentage > 0 ? 1000 : 0
                }" class="transition all duration-300" />
            </Transition>
            <ReadingListButton />
            <Transition name="savebutton">
                <SaveArticleButton v-if="store.articles.length > 0" :style="{
                    'transform': 'scale(' + (store.swipeRightPercentage * 0.5 + 100) + '%)',
                    'z-index': store.swipeRightPercentage > 0 ? 1000 : 0
                }" class="transition all duration-300" />
            </Transition>
        </div>
    </div>
</template>