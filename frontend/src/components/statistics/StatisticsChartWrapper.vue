<script lang="ts" setup>
defineProps<{
    title: string;
    value1?: string;
    value2?: string;
}>();
</script>

<template>
    <div class=" bg-white/5 py-5 px-7 sm:px-10 rounded-xl w-full flex flex-col gap-5">
        <div class="flex justify-between gap-4">
            <h3>{{ title }}</h3>
            <div class="flex gap-x-4 gap-y-0 flex-wrap justify-end">
                <div v-if="value1" class="flex gap-2 items-center">
                    <div class="bg-primary-600 h-3 w-3 rounded-sm"></div>
                    <div class="text-sm text-background-300">{{ value1 }}</div>
                </div>
                <div v-if="value2" class="flex gap-2 items-center">
                    <div class="bg-primary-300 h-3 w-3 rounded-sm"></div>
                    <div class="text-sm text-background-300">{{ value2 }}</div>
                </div>
            </div>
        </div>
        <div class="flex w-full justify-between h-full gap-2">
            <slot></slot>
        </div>
    </div>
</template>
