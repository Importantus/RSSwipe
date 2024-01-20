<script setup lang="ts">
import { useReadingListStore } from '@/stores/readingList';
import { RedoDot, MoveRight } from 'lucide-vue-next';

defineProps<{
    isOnlyUnread: boolean;
}>()

const store = useReadingListStore();

</script>

<template>
    <div v-if="isOnlyUnread" @click="store.setNextArticleOnlyUnread(true)"
        :class="{ 'bg-background-900 bg-opacity-30': !store.nextArticleOnlyUnread, 'bg-primary-600': store.nextArticleOnlyUnread }"
        class="cursor-pointer w-full p-3 flex flex-col items-center gap-2 justify-center rounded-lg transition-colors ease-out duration-300">
        <RedoDot :style="{ color: (store.nextArticleOnlyUnread ? 'white' : 'bg-primary-600') }" class="opacity-70"
            :class="{ 'opacity-100 ': store.nextArticleOnlyUnread }" />
        <span class="text-center">Only Unread Articles</span>
    </div>
    <div v-if="!isOnlyUnread" @click="store.setNextArticleOnlyUnread(false)"
        :class="{ 'bg-background-900 bg-opacity-30': store.nextArticleOnlyUnread, 'bg-primary-600': !store.nextArticleOnlyUnread }"
        class="cursor-pointer w-full p-3 flex flex-col items-center gap-2 justify-center rounded-lg transition-colors ease-out duration-300">
        <MoveRight :style="{ color: (store.nextArticleOnlyUnread ? 'white' : 'bg-primary-600') }" class="opacity-70"
            :class="{ 'opacity-100 ': !store.nextArticleOnlyUnread }" />
        <span class="text-center">Sequential</span>
    </div>
</template>