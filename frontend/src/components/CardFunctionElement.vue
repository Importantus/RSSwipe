<script setup lang="ts">
import DiscardArticleButton from '@/components/DiscardArticleButton.vue';
import SaveArticleButton from '@/components/SaveArticleButton.vue';
import ReadingListButton from '@/components/ReadingListButton.vue';
</script>

<template>
    <div class="flex flex-row items-center bg-secondary rounded-3xl justify-between px-4 p-3 mx-16">
        <DiscardArticleButton />
        <ReadingListButton />
        <SaveArticleButton />
    </div>
</template>