<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import { useReaderStore } from '@/stores/reader';

const store = useReaderStore()

function openExternal() {
    store.openArticleExternal(store.storedArticles[0].articleInfo);
}

</script>

<template>
    <button @click="openExternal">
        <ExternalLink size=" 28" class=" text-primary-600  m-3" />
    </button>
</template>
