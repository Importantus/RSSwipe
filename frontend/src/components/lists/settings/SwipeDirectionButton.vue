<script setup lang="ts">
import type { SwipeDirection } from '@/types';

interface Props {
    ownDirection: SwipeDirection;
    selected: boolean;
    onClick: () => void;
}

const props = defineProps<Props>();
</script>

<template>
    <div @click="onClick" :class="{ 'bg-background-900 bg-opacity-30': !selected, 'bg-primary-600': selected }"
        class="cursor-pointer w-full p-3 flex flex-col items-center gap-2 justify-center rounded-lg transition-colors ease-out duration-300">
        <props.ownDirection.icon :style="{ color: (selected ? 'white' : props.ownDirection.color) }" class="opacity-70"
            :class="{ 'opacity-100 ': selected }" />
        <span class="text-center">{{ props.ownDirection.name }}</span>
    </div>
</template>
