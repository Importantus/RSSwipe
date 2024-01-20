<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import hotkeys from 'hotkeys-js';
import { useHomeStore } from '@/stores/home';
import { X } from 'lucide-vue-next';

const store = useHomeStore();

onMounted(() => {
    hotkeys('left, h', () => {
        store.discardArticle();
        return false;
    });
});

onBeforeUnmount(() => {
    hotkeys.unbind('left, h');
});
</script>

<template>
    <button class=" bg-tertiary-200 rounded-full" @click="store.discardArticle();" title="Discard Article">
        <X size="24" class=" text-primary-600 m-3" />
    </button>
</template>
