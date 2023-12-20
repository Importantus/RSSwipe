<script setup lang="ts">
import DiscardArticleButton from '@/components/DiscardArticleButton.vue';
import SaveArticleButton from '@/components/SaveArticleButton.vue';
import ReadingListButton from '@/components/ReadingListButton.vue';
import { useStartPageStore } from '@/stores/startPage';

const store = useStartPageStore();
</script>

<template>
    <div>
        <Transition  name="shareelement-hide">
            <div v-if="store.articles.length > 0" class="mb-0 flex flex-row items-center justify-between bg-secondary-900 rounded-[30px] w-56 m-auto p-4 px-7"
    >
        <DiscardArticleButton />
        <ReadingListButton />
        <SaveArticleButton />
    </div>
        </Transition>
    </div>

</template>