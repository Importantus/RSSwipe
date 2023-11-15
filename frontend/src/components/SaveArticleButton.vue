<script setup lang="ts">
function SaveArticle() {
    console.log("SaveArticle");
}
import { BookOpenCheck } from 'lucide-vue-next';
</script>

<template>
    <button class="bg-primary rounded-full" @click="SaveArticle">
        <BookOpenCheck size="28" class=" text-white m-3" />
    </button>
</template>
