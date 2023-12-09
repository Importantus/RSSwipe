<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { useReadingListStore } from '@/stores/readingList';

const store = useReadingListStore();
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Reading List Settings" backNavigationPath="/readinglist" class="mb-5" />

    </div>
</template>