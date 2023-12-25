<script setup lang="ts">
import { MoveLeft } from 'lucide-vue-next';

defineProps({
    title: String,
    backNavigationPath: String
})
</script>

<template>
    <div class="flex flex-row items-center justify-between mt-5 sticky top-0 py-5 z-10 bg-background-950">
        <div class="flex flex-row items-center w-full">
            <router-link v-if="backNavigationPath" :to="backNavigationPath">
                <MoveLeft size="24" class=" text-white" />
            </router-link>
            <h1 class="truncate ... max-width-full text-2xl font-bold text-white ml-2">{{ title }}</h1>
        </div>
        <div class="flex flex-row items-center">
            <slot></slot>
        </div>
    </div>
</template>