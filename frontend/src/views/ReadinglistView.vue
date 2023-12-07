<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import ReadinglistList from '@/components/list/ReadinglistList.vue';
import { useReadingListStore } from '@/stores/readingList';
import { Undo2 } from 'lucide-vue-next';

const store = useReadingListStore();
</script>
<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Reading List" backNavigationPath="/" class="mb-5">
            <Undo2 v-if="store.lastRemovedArticleId" size="24" class=" text-white" :onclick="store.undo" />
        </TitleNavigationBar>
        <ReadinglistList />
    </div>
</template>