<script setup lang="ts">
import DiscardArticleButton from '@/components/DiscardArticleButton.vue';
import SaveArticleButton from '@/components/SaveArticleButton.vue';
import ReadingListButton from '@/components/ReadingListButton.vue';
import { useStartPageStore } from '@/stores/startPage';

const store = useStartPageStore();
</script>

<template>
    <div>

        <div class="mb-0 flex flex-row items-center justify-between gap-2 bg-secondary-900 rounded-[30px] w-fit m-auto p-4 transition-width ease-out duration-1000" 
            :class="{ 'px-5': store.articles.length === 0, 'px-7': store.articles.length > 0 }">
            <Transition name="discardbutton">
                <DiscardArticleButton v-if="store.articles.length > 0" />
            </Transition>
            <ReadingListButton />
            <Transition name="savebutton">
                <SaveArticleButton v-if="store.articles.length > 0" />
            </Transition>
        </div>
    </div>
</template>