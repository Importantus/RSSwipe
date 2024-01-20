<script setup lang="ts">
import ReaderShareButton from '@/components/reader/controlBar/ReaderShareButton.vue';
import ReaderStarButton from '@/components/reader/controlBar/ReaderStarButton.vue';
import ReaderExternalButton from '@/components/reader/controlBar/ReaderExternalButton.vue';
</script>

<template>
    <div
        class="flex flex-row items-center justify-between bg-secondary-900 rounded-[30px] gap-3 w-fit m-auto p-2 px-4 backdrop-blur-md bg-opacity-70">
        <ReaderShareButton title="Share the article" />
        <ReaderStarButton title="Star the article" />
        <ReaderExternalButton title="Open the article in a new tab" />
    </div>
</template>
