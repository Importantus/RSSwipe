<script setup lang="ts">
function openReadinglist() {
    router.push({ name: 'Reading List' });
}
import router from '@/router';
import { List } from 'lucide-vue-next';
</script>

<template>
    <button @click="openReadinglist">
        <List size="24" class=" text-white m-3" />
    </button>
</template>