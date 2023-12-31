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
    <div @click="onClick" :class="{ 'border-primary-600 border-2': selected }"
        class="cursor-pointer w-full p-3 flex flex-col items-center gap-2 justify-center bg-background-900 bg-opacity-30 rounded-lg">
        <props.ownDirection.icon :style="{ color: props.ownDirection.color }" class="opacity-70" />
        <span class="text-center">{{ props.ownDirection.name }}</span>
    </div>
</template>