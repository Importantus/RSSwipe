<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import hotkeys from 'hotkeys-js';
import router from '@/router';
import { List } from 'lucide-vue-next';

function openReadinglist() {
    router.push({ name: 'Reading List' });
}

onMounted(() => {
    hotkeys('space', (event) => {
        openReadinglist();
        event.preventDefault(); 
        return false;
    });
});

onBeforeUnmount(() => {
    hotkeys.unbind('space');
});
</script>

<template>
    <button @click="openReadinglist" title="Reading list">
        <List size="24" class="text-white m-3" />
    </button>
</template>
