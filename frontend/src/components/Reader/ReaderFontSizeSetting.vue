<script setup lang="ts">
import { useReaderStore, type FontSize } from '@/stores/reader';
import type { PropType } from 'vue';

const store = useReaderStore()

const props = defineProps({
    fontSize: {
        type: Object as PropType<FontSize>,
        required: true
    }
})
</script>

<template>
    <div @click="store.setFontSize(props.fontSize.id)" title="Font size"
        class="rounded-lg w-12 h-10 flex items-center justify-center bg-background-950 cursor-pointer"
        :class="{ 'border-primary-600 border-solid border-2': store.settings.fontSize.id === props.fontSize.id }">
        <div class="w-full h-1/2 flex items-center justify-center border-t-[0.5px] border-b-[0.5px] border-solid border-tertiary-700"
            :class="{
                'text-xs': props.fontSize.id === 'small',
                'text-base': props.fontSize.id === 'medium',
                'text-xl': props.fontSize.id === 'large',
            }">Aa</div>
    </div>
</template>