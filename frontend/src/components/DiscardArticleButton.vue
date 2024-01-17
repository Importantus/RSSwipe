<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import hotkeys from 'hotkeys-js';
import { useStartPageStore } from '@/stores/startPage';
import { X } from 'lucide-vue-next';

const store = useStartPageStore();

onMounted(() => {
    // Binden Sie den Hotkey zum Verwerfen eines Artikels
    hotkeys('left', () => {
        store.discardArticle();
           return false;
    });

    hotkeys('h', () => {
        store.discardArticle();
        return false;
    });
});

onBeforeUnmount(() => {
       hotkeys.unbind('left');
       hotkeys.unbind('h');
});
</script>

<template>
    <button class="bg-tertiary-200 rounded-full" @click="store.discardArticle">
        <X size="24" class="text-primary-600 m-3" />
    </button>
</template>
