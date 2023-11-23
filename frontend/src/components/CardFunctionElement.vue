<script setup lang="ts">
import DiscardArticleButton from '@/components/DiscardArticleButton.vue';
import SaveArticleButton from '@/components/SaveArticleButton.vue';
import ReadingListButton from '@/components/ReadingListButton.vue';
</script>

<template>
    <div class="flex flex-row items-center justify-between bg-secondary-900 rounded-[30px] w-56 m-auto p-4 px-7">
        <DiscardArticleButton />
        <ReadingListButton />
        <SaveArticleButton />
    </div>
</template>