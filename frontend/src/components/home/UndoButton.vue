<script setup lang="ts">
import { useStartPageStore } from '@/stores/startPage';
import { Undo2 } from 'lucide-vue-next';

const store = useStartPageStore();
</script>
<template>
    <Undo2 :size="24" color="white" @click="store.revertAction" />
</template>