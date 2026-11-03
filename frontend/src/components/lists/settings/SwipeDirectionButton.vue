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
    <button type="button" @click="onClick" :aria-pressed="selected"
        :class="selected ? 'bg-primary-600/20 border-primary-500' : 'bg-white/5 border-transparent'"
        class="w-full px-2 py-3 flex flex-col items-center gap-2 justify-center rounded-xl border transition active:scale-[0.97]">
        <props.ownDirection.icon :size="22" :style="{ color: props.ownDirection.color }"
            :class="selected ? 'opacity-100' : 'opacity-60'" />
        <span class="text-center text-xs font-text-detail leading-tight"
            :class="selected ? 'text-white' : 'text-background-300'">{{ props.ownDirection.name }}</span>
    </button>
</template>
