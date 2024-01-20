<script setup lang="ts">
const props = defineProps<{
    show: boolean
}>()
</script>

<template>
    <div v-if="props.show" class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
    </div>
</template>
