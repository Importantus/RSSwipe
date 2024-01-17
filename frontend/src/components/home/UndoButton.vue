<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import hotkeys from 'hotkeys-js';
import { useStartPageStore } from '@/stores/startPage';
import { Undo2 } from 'lucide-vue-next';

const store = useStartPageStore();

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