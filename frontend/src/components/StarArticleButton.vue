<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { useReaderStore } from '@/stores/reader';

const store = useReaderStore()
let starred = ref(false);

onMounted(async () => {
    starred.value = (await store.getStarStatus(store.storedArticles[0].articleInfo)) ?? false;
    console.log("Post is starred: " + starred.value)
});

function toggleStar() {
    store.setArticleStarred(store.storedArticles[0].articleInfo, !starred.value);
    starred.value = !starred.value;
}

</script>

<template>
    <button class="" @click="toggleStar">
        <Star size="28" class="m-3"
            :class="{ 'fill-primary-600 text-primary-600': starred, 'text-primary-600': !starred }" />
    </button>
</template>
