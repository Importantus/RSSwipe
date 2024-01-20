<script setup lang="ts">
const props = defineProps<{
    title: string
    description: string
}>()
</script>

<template>
    <div class="flex flex-col gap-5" title="change the Font Size">
        <div class="flex flex-col gap-2">
            <div class="font-title text-xl">{{ props.title }}</div>
            <div class="text-background-300 text-lg leading-tight">{{ props.description }}</div>
        </div>
        <slot></slot>
    </div>
</template>