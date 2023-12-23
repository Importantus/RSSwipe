<script setup lang="ts">
import { Share2 } from 'lucide-vue-next';
import { useReaderStore } from '@/stores/reader';
import { onMounted, ref } from 'vue';

const store = useReaderStore()
let canShare = ref(false);

onMounted(async () => {
    try {
        navigator.canShare();
        canShare.value = true;
    } catch (error) {
        console.log("Error: Sharing not supported")
    }
});

function shareArticle() {
    store.shareArticle(store.storedArticles[0].articleInfo);
}

</script>

<template>
    <div v-if="canShare" class="flex items-center">
        <button @click="shareArticle">
            <Share2 size=" 28" class="white  m-3" />
        </button>
    </div>
    <div v-else class="flex items-center">
        <button disabled>
            <Share2 size=" 28" class="white opacity-40 m-3" />
        </button>
    </div>
</template>
