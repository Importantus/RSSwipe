<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import hotkeys from 'hotkeys-js';
import { useHomeStore } from '@/stores/home';
import { Undo2 } from 'lucide-vue-next';

const store = useHomeStore();

onMounted(() => {
    hotkeys('backspace', () => {
        store.revertAction();
        return false;
    });
});

onBeforeUnmount(() => {
    hotkeys.unbind('backspace');
});
</script>

<template>
    <Undo2 :size="24" color="white" @click="store.revertAction" />
</template>
