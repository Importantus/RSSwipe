<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

defineProps({
    title: String,
    backNavigationPath: String,
    backHomePath: String
})
</script>

<template>
    <div class="flex flex-row items-center justify-between mt-5 sticky top-0 py-5 z-10 bg-background-950">
        <div class="flex flex-row items-center w-full min-w-0 gap-1">
            <router-link v-if="backNavigationPath" :to="backNavigationPath" title="Back"
                class="-ml-2 w-10 h-10 flex-none flex items-center justify-center rounded-full transition active:bg-white/10">
                <ChevronLeft :size="28" class="text-inherit" />
            </router-link>
            <h1 class="truncate text-2xl font-bold text-inherit" :class="{ 'ml-1': backNavigationPath }">{{ title }}</h1>
        </div>
        <div class="flex flex-row items-center">
            <slot></slot>
        </div>
    </div>
</template>
