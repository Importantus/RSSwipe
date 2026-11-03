<script setup lang="ts">
import { computed } from 'vue';
import { useReadingListStore } from '@/stores/readingList';
import { RedoDot, MoveRight } from 'lucide-vue-next';

const props = defineProps<{
    isOnlyUnread: boolean;
}>()

const store = useReadingListStore();

const selected = computed(() => store.nextArticleOnlyUnread === props.isOnlyUnread);
</script>

<template>
    <button type="button" @click="store.setNextArticleOnlyUnread(isOnlyUnread)" :aria-pressed="selected"
        :class="selected ? 'bg-primary-600/20 border-primary-500' : 'bg-white/5 border-transparent'"
        class="w-full px-2 py-3 flex flex-col items-center gap-2 justify-center rounded-xl border transition active:scale-[0.97]">
        <component :is="isOnlyUnread ? RedoDot : MoveRight" :size="22" class="text-primary-400"
            :class="selected ? 'opacity-100' : 'opacity-60'" />
        <span class="text-center text-xs font-text-detail leading-tight"
            :class="selected ? 'text-white' : 'text-background-300'">{{ isOnlyUnread ? 'Only unread' : 'Sequential' }}</span>
    </button>
</template>
