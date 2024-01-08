<script setup lang="ts">
import { useReaderStore, type ColorScheme } from '@/stores/reader';
import type { PropType } from 'vue';
const store = useReaderStore()

const props = defineProps({
    colorScheme: {
        type: Object as PropType<ColorScheme>,
        required: true
    }
})

</script>

<template>
    <div @click="store.setColor(props.colorScheme.id)"
        class="rounded-full overflow-hidden w-10 aspect-square flex flex-row rotate-45 cursor-pointer"
        :class="{ 'border-primary-600 border-solid border-2': store.settings.colorScheme.id === props.colorScheme.id }">
        <div class="w-1/2 h-full" :style="{ backgroundColor: props.colorScheme.foreground }"></div>
        <div class="w-1/2 h-full" :style="{ backgroundColor: props.colorScheme.background }"></div>
    </div>
</template>