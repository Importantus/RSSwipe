<script setup lang="ts">
function DiscardArticle() {
    console.log("DiscardArticle");
}
import { List } from 'lucide-vue-next';
</script>

<template>
    <button @click="DiscardArticle">
        <List size="28" class=" text-white m-3" />
    </button>
</template>