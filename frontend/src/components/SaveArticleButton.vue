<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import hotkeys from 'hotkeys-js';
import { useStartPageStore } from '@/stores/startPage';
import { BookOpenCheck } from 'lucide-vue-next';

const store = useStartPageStore();

onMounted(() => {
    
    hotkeys('right, l', () => {
        store.saveArticle();
               return false;
    });
});

onBeforeUnmount(() => {
        hotkeys.unbind('right, l');   
});     
</script>

<template>
    <button class="bg-primary-600 rounded-full" @click="store.saveArticle" title="Save Article">
        <BookOpenCheck size="24" class=" text-white m-3" />
    </button>
</template>
