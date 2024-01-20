<script setup lang="ts">
import { colorSchemes, fonts, fontSizes } from '@/stores/reader';
import ReaderColorSetting from './ReaderColorSetting.vue';
import ReaderFontSetting from './ReaderFontSetting.vue';
import ReaderFontSizeSetting from './ReaderFontSizeSetting.vue';

function isChromium() {
    return navigator.userAgent.includes("Chrom");
}
</script>

<template>
    <div class="flex flex-col bg-background-900 backdrop-blur-md rounded-xl"
        :class="{ 'bg-opacity-70': !isChromium(), 'bg-opacity-90': isChromium() }">
        <div class="flex flex-row w-full px-5 py-5 justify-around gap-5">
            <ReaderColorSetting v-for="colorScheme in colorSchemes" :key="colorScheme.id" :colorScheme="colorScheme" />
        </div>
        <div class="flex flex-row w-full px-5 py-5 justify-around gap-5 bg-background-950 bg-opacity-50">
            <ReaderFontSetting v-for="font in fonts" :key="font.id" :font="font" />
        </div>
        <div class="flex flex-row w-full px-5 py-5 justify-around gap-5">
            <ReaderFontSizeSetting v-for="fontSize in fontSizes" :key="fontSize.id" :fontSize="fontSize" />
        </div>
    </div>
</template>
