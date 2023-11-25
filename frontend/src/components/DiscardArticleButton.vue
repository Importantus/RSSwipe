<script setup lang="ts">
function DiscardArticle() {
    console.log("DiscardArticle");
}
import { X } from 'lucide-vue-next';
</script>

<template>
    <button class=" bg-tertiary-200 rounded-full" @click="DiscardArticle">
        <X size="24" class=" text-primary-600 m-3" />
    </button>
</template>