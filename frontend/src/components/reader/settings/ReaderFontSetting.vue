<script setup lang="ts">
import { useReaderStore, type Font } from '@/stores/reader';
import type { PropType } from 'vue';

const props = defineProps({
    font: {
        type: Object as PropType<Font>,
        required: true
    }
})

const store = useReaderStore();
</script>

<template>
    <div @click="store.setFont(props.font.id)" title="Font type"
        class="rounded-lg overflow-hidden w-12 h-10 flex items-center justify-center bg-background-950 cursor-pointer"
        :class="{ 'border-primary-600 border-solid border-2': store.settings.font.id === props.font.id }">
        <div class="text-lg" :style="{ fontFamily: props.font.font }">Aa</div>
    </div>
</template>
