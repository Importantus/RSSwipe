<script setup lang="ts">
import ShareArticleButton from '@/components/ShareArticleButton.vue';
import StarArticleButton from '@/components/StarArticleButton.vue';
import OpenExternalButton from './OpenExternalButton.vue';
</script>

<template>
    <div class="flex flex-row items-center justify-between bg-secondary-900 rounded-[30px] w-56 m-auto p-4 px-7">
        <ShareArticleButton />
        <StarArticleButton />
        <OpenExternalButton />
    </div>
</template>