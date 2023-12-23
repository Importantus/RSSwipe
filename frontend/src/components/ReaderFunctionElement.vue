<script setup lang="ts">
import ShareArticleButton from '@/components/ShareArticleButton.vue';
import StarArticleButton from '@/components/StarArticleButton.vue';
import OpenExternalButton from './OpenExternalButton.vue';
import ReaderSettingsButton from './Reader/FunctionBar/ReaderSettingsButton.vue';
</script>

<template>
    <div
        class="flex flex-row items-center justify-between bg-secondary-900 rounded-[30px] gap-3 w-fit m-auto p-2 px-4 backdrop-blur-md bg-opacity-70">
        <ShareArticleButton />
        <ReaderSettingsButton />
        <StarArticleButton />
        <OpenExternalButton />
    </div>
</template>