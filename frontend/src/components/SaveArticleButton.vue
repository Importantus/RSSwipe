<script setup lang="ts">
function SaveArticle() {
    console.log("SaveArticle");
}
import { BookOpenCheck } from 'lucide-vue-next';
</script>

<template>
    <button class="bg-primary-600 rounded-full" @click="SaveArticle">
        <BookOpenCheck size="24" class=" text-white m-3" />
    </button>
</template>
