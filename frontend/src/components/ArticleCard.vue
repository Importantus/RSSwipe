<script setup lang="ts">
import ArticleInfoElement from '@/components/ArticleInfoElement.vue';
import { useStartPageStore } from '@/stores/startPage';
import type { Article } from '@/types';
import { computed, ref } from 'vue';
import { ReaderContext, useReaderStore } from '@/stores/reader';
const props = defineProps<{
    article: Article;
    index: number;
}>()

const store = useStartPageStore();
const readerStore = useReaderStore();

const hidden = ref(false);
const elementTransformX = ref(0)
const elementRotateZ = computed(() => elementTransformX.value / 8);

let posX = 0;

const displayWidth = window.innerWidth;
const swipeToTrigger = displayWidth / 10;

function openinReader() {
    readerStore.openArticle(ReaderContext.STARTPAGE, store.articles[0]);
}

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

    elementTransformX.value = diff;
}

function releaseHandler() {
    if (props.index !== 0) return;
    if (elementTransformX.value > swipeToTrigger) {
        elementTransformX.value = 500;
        setTimeout(() => {
            store.saveArticle();
        }, 100);
    } else if (elementTransformX.value < -swipeToTrigger) {
        elementTransformX.value = -500;
        setTimeout(() => {
            store.discardArticle();
        }, 100);
    } else {
        elementTransformX.value = 0;
    }
}


let templateArr: string[] =
    ["/images/articles/placeholder01.png",
        "/images/articles/placeholder02.png",
        "/images/articles/placeholder03.png",
        "/images/articles/placeholder04.png"]

let url = ref("")

if (!props.article.imageUrl) {
    url.value = templateArr[Math.floor(Math.random() * templateArr.length)];
} else {
    url = computed(() => `"${props.article.imageUrl}"`)
}

</script>

<template>
    <div @click="openinReader">
        <div v-if="!hidden" v-touch:drag="swipeHandler" v-touch:press="pressHandler" v-touch:release="releaseHandler"
            class="transitions h-full max-h-[70vh] drop-shadow-lg rounded-xl bg-center bg-cover bg-background-800" :style="{
                marginTop: 1.5 - (props.index * 0.75) + 'rem',
                backgroundImage: 'url(' + url + ')',
                transform: 'translateX(' + elementTransformX + 'px) rotateZ(' + elementRotateZ + 'deg)',
            }">
            <div
                class="absolute font-text-detail top-3 left-3 bg-background-900 bg-opacity-50 px-2 py-1 text-xs rounded-lg">
                {{ new Date(props.article.publishedAt).toLocaleString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    minute: 'numeric',
                    hour: 'numeric'
                }) }}
            </div>
            <ArticleInfoElement :article="props.article" class="rounded-xl absolute bottom-0" />
        </div>
    </div>
</template>

<style scoped>
.transitions {
    transition: transform 0.1s linear, margin-top 0.5s ease-out;
}
</style>