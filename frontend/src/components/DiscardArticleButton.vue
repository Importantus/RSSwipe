<script setup lang="ts">
import { useStartPageStore } from '@/stores/startPage';
import { X } from 'lucide-vue-next';

const store = useStartPageStore();
</script>

<template>
    <button class=" bg-tertiary-200 rounded-full" @click="store.discardArticle();" title="Discard Article">
        <X size="24" class=" text-primary-600 m-3" />
    </button>
</template>