<script lang="ts" setup>
defineProps<{
    title: string;
    value1?: string;
    value2?: string;
}>();
</script>

<template>
    <div class=" bg-secondary-950 py-4 px-5 rounded-2xl w-full flex flex-col gap-4">
        <div class="flex justify-between gap-4">
            <h3 class="font-semibold text-sm">{{ title }}</h3>
            <div class="flex gap-x-4 gap-y-0 flex-wrap justify-end">
                <div v-if="value1" class="flex gap-2 items-center">
                    <div class="bg-primary-600 h-3 w-3 rounded-sm"></div>
                    <div class="text-xs font-text-detail text-background-300">{{ value1 }}</div>
                </div>
                <div v-if="value2" class="flex gap-2 items-center">
                    <div class="bg-primary-300 h-3 w-3 rounded-sm"></div>
                    <div class="text-xs font-text-detail text-background-300">{{ value2 }}</div>
                </div>
            </div>
        </div>
        <div class="flex w-full justify-between h-full gap-2">
            <slot></slot>
        </div>
    </div>
</template>
