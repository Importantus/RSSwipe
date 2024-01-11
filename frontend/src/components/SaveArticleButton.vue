<script setup lang="ts">
import { useStartPageStore } from '@/stores/startPage';
import { BookOpenCheck } from 'lucide-vue-next';

const store = useStartPageStore();
</script>

<template>
    <button class="bg-primary-600 rounded-full" @click="store.saveArticle" title="Save Article">
        <BookOpenCheck size="24" class=" text-white m-3" />
    </button>
</template>
