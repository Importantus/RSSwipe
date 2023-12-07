<script setup lang="ts">
import type { Article } from '@/types';
import ArticleSource from '../ArticleSource.vue';
import { ref } from 'vue';
import { useReadingListStore } from '@/stores/readingList';
import { Trash2 } from 'lucide-vue-next';

const props = defineProps<{
    article: Article;
}>();

const store = useReadingListStore();

const elementTransformX = ref(0)
let posX = 0;

const displayWidth = window.innerWidth;
const swipeToTrigger = displayWidth / 3;

function pressHandler(event: TouchEvent | MouseEvent) {
    event.preventDefault();
    console.log(event.type);
    if (event.type === 'mousedown') {
        posX = (event as MouseEvent).clientX;
    } else {
        posX = (event as TouchEvent).touches[0].clientX;
    }
}

function swipeHandler(event: TouchEvent | MouseEvent) {
    (event as TouchEvent).preventDefault();

    let currentX = 0;
    if (event.type === 'mousemove') {
        currentX = (event as MouseEvent).clientX;
    } else {
        currentX = (event as TouchEvent).touches[0].clientX;
    }

    const diff = currentX - posX;

    if (Math.abs(diff) > displayWidth / 5 || elementTransformX.value !== 0) {
        elementTransformX.value = diff;

    }
}

function releaseHandler(event: TouchEvent | MouseEvent) {
    event.preventDefault();
    if (elementTransformX.value > swipeToTrigger) {
        elementTransformX.value = 1000;
        store.removeArticle(props.article);
    } else if (elementTransformX.value < -100) {
        elementTransformX.value = -1000;
    } else {
        elementTransformX.value = 0;
    }
}
</script>

<template>
    <RouterLink :to="`/article/${props.article.id}`">
        <div class="w-full rounded-xl overflow-hidden bg-[#712f2f40] transition-colors relative"
            :class="{ 'bg-[#92212180]': elementTransformX > swipeToTrigger }">
            <Trash2 size="40" class="absolute m-auto top-0 bottom-0 text-[#421a1a]"
                :style="{ left: swipeToTrigger / 3 - 24 + 'px' }" />
            <div draggable="false" v-touch:drag="swipeHandler" v-touch:press="pressHandler" v-touch:release="releaseHandler"
                class="w-full bg-[#222] py-4 px-5  flex flex-col gap-2 transition-transform ease-linear duration-100"
                :style="{ transform: 'translateX(' + elementTransformX + 'px)' }">
                <div>
                    <ArticleSource :article="props.article" />
                </div>
                <h2 class="text-lg">{{ props.article.title }}</h2>
            </div>
        </div>
    </RouterLink>
</template>
