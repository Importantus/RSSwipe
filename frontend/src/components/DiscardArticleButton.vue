<script setup lang="ts">
function DiscardArticle() {
    console.log("DiscardArticle");
}
import { X } from 'lucide-vue-next';
</script>

<template>
    <button class="bg-zinc-400 rounded-full" @click="DiscardArticle">
        <X size="28" class=" text-primary m-3" />
    </button>
</template>