<script setup lang="ts">
import ArticleInfo from '@/components/articles/ArticleInfo.vue';
import ArticleDate from '@/components/articles/ArticleDate.vue';
import { useHomeStore } from '@/stores/home';
import type { Article } from '@/types';
import { computed, ref } from 'vue';
import router from '@/router';

const props = defineProps<{
    article: Article;
    index: number;
}>()

const store = useHomeStore();

const elementTransformX = ref(0)
const elementRotateZ = computed(() => elementTransformX.value / 8);
const displayWidth = window.innerWidth;
const swipeToTrigger = displayWidth / 10;
const fallbackImages: string[] = [
    "/images/articles/placeholder01.png",
    "/images/articles/placeholder02.png",
    "/images/articles/placeholder03.png",
    "/images/articles/placeholder04.png"
]
const imageUrl = computed(() => {
    if (!props.article.imageUrl) {
        return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    } else {
        return `"${props.article.imageUrl}"`
    }
})

let posX = 0;

function openinReader() {
    router.push(`/article/${props.article.id}`);
}

function pressHandler(event: TouchEvent | MouseEvent) {
    if (props.index !== 0) return;
    if (event.type === 'mousedown') {
        posX = (event as MouseEvent).clientX;
    } else {
        posX = (event as TouchEvent).touches[0].clientX;
    }

    store.swipeLeftPercentage = 0;
    store.swipeRightPercentage = 0;
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

    if (diff > 0) {
        store.swipeRightPercentage = Math.round((Math.abs(diff) / swipeToTrigger) * 100);
        store.swipeLeftPercentage = 0;
    } else {
        store.swipeLeftPercentage = Math.round((Math.abs(diff) / swipeToTrigger) * 100);
        store.swipeRightPercentage = 0;
    }

    elementTransformX.value = diff;
}

function releaseHandler() {
    if (props.index !== 0) return;
    if (elementTransformX.value > swipeToTrigger) {
        elementTransformX.value = 500;
        store.swipeRightPercentage = 500;
        setTimeout(() => {
            store.swipeRightPercentage = 0;
            store.saveArticle();
        }, 100);
    } else if (elementTransformX.value < -swipeToTrigger) {
        elementTransformX.value = -500;
        store.swipeLeftPercentage = 500;
        setTimeout(() => {
            store.swipeLeftPercentage = 0;
            store.discardArticle();
        }, 100);
    } else {
        elementTransformX.value = 0;
    }

    setTimeout(() => {
        store.swipeLeftPercentage = 0;
        store.swipeRightPercentage = 0;
    }, 100);

}
</script>

<template>
    <div @click="openinReader" class="absolute w-full transitions" :style="{
        top: 1.5 - (props.index * 0.75) + 'rem',
        bottom: (props.index * 0.75) + 'rem',
    }">
        <div v-touch:drag="swipeHandler" v-touch:press="pressHandler" v-touch:release="releaseHandler"
            class="transition-all duration-100 ease-linear h-full drop-shadow-lg rounded-xl bg-center bg-cover bg-background-800"
            :style="{
                backgroundImage: 'url(' + imageUrl + ')',
                transform: 'translateX(' + elementTransformX + 'px) rotateZ(' + elementRotateZ + 'deg)',
            }">
            <ArticleDate :article="props.article" class="absolute top-3 left-3" />
            <ArticleInfo :article="props.article" class="rounded-xl absolute bottom-0" />
        </div>
    </div>
</template>

<style scoped>
.transitions {
    transition: top 0.5s ease-out, bottom 0.5s ease-out;
}
</style>
