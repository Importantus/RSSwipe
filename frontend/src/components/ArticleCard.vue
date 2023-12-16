<script setup lang="ts">
import ArticleInfoElement from '@/components/ArticleInfoElement.vue';
import { useStartPageStore } from '@/stores/startPage';
import type { Article } from '@/types';
import { computed, ref } from 'vue';
const props = defineProps<{
    article: Article;
    index: number;
}>()

const store = useStartPageStore();

const hidden = ref(false);
const elementTransformX = ref(0)
const elementRotateZ = computed(() => elementTransformX.value / 10);

let posX = 0;

const displayWidth = window.innerWidth;
const swipeToTrigger = displayWidth / 4;

function pressHandler(event: TouchEvent | MouseEvent) {
    if (props.index !== 0) return;
    if (event.type === 'mousedown') {
        posX = (event as MouseEvent).clientX;
    } else {
        posX = (event as TouchEvent).touches[0].clientX;
    }
}

function swipeHandler(event: TouchEvent | MouseEvent) {
    if (props.index !== 0) return;
    let currentX = 0;
    if (event.type === 'mousemove') {
        currentX = (event as MouseEvent).clientX;
    } else {
        currentX = (event as TouchEvent).touches[0].clientX;
    }

    const diff = currentX - posX;

    if (Math.abs(diff) > displayWidth / 20 || elementTransformX.value !== 0) {
        elementTransformX.value = diff;
    }
}

function releaseHandler() {
    if (props.index !== 0) return;
    if (elementTransformX.value > swipeToTrigger) {
        elementTransformX.value = 500;
        store.saveArticle();
    } else if (elementTransformX.value < -swipeToTrigger) {
        elementTransformX.value = -500;
        store.discardArticle()
    } else {
        elementTransformX.value = 0;
    }
}

const url = computed(() => `"${props.article.imageUrl}"`)
const articleUrl = computed(() => `/article/${props.article.id}`)
</script>

<template>
    <RouterLink :to="articleUrl">
        <div v-if="!hidden" v-touch:drag="swipeHandler" v-touch:press="pressHandler" v-touch:release="releaseHandler"
            class="transitions h-full max-h-[70vh] drop-shadow-lg rounded-xl bg-center bg-cover bg-background-800" :style="{
                marginTop: 1.5 - (props.index * 0.75) + 'rem',
                backgroundImage: 'url(' + url + ')',
                transform: 'translateX(' + elementTransformX + 'px) rotateZ(' + elementRotateZ + 'deg)',
            }">
            <ArticleInfoElement :article="props.article" class="rounded-xl absolute bottom-0" />
        </div>
    </RouterLink>
</template>

<style scoped>
.transitions {
    transition: transform 0.1s linear, margin-top 0.5s ease-out;
}
</style>