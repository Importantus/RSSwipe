<script setup lang="ts">
import type { Article, SwipeDirection } from '@/types';
import ArticleSource from '../ArticleSource.vue';
import { ref } from 'vue';
import { FileDown, BookOpenCheck, Star } from 'lucide-vue-next';
import { ReaderContext, useReaderStore } from '@/stores/reader';

const props = defineProps<{
    article: Article;
    downloaded: boolean;
    swipeLeft: SwipeDirection,
    swipeRight: SwipeDirection,
    starredList: boolean
}>();

const readerStore = useReaderStore();

const elementTransformX = ref(0)
let posX = 0;
let mouseover = ref(false);

const displayWidth = window.innerWidth;
const swipeToTrigger = displayWidth / 3;

function openInReader() {
    if (!props.starredList) {
        readerStore.openArticle(ReaderContext.READINGLIST, props.article);
    } else {
        readerStore.openArticle(ReaderContext.STARREDLIST, props.article);
    }

}

function pressHandler(event: TouchEvent | MouseEvent) {
    if (mouseover.value) return;
    console.log(event.type);
    if (event.type === 'mousedown') {
        posX = (event as MouseEvent).clientX;
    } else {
        posX = (event as TouchEvent).touches[0].clientX;
    }
}


function swipeHandler(event: TouchEvent | MouseEvent) {
    if (mouseover.value) return;
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

function releaseHandler() {
    if (mouseover.value) return;
    if (elementTransformX.value > swipeToTrigger) {
        if (props.swipeRight.removeCard) {
            elementTransformX.value = 1000;
        } else {
            setTimeout(() => {
                elementTransformX.value = 0;
            }, 700);
        }
        props.swipeRight.action(props.article);
    } else if (elementTransformX.value < -swipeToTrigger) {
        if (props.swipeLeft.removeCard) {
            elementTransformX.value = -1000;
        } else {
            elementTransformX.value = -swipeToTrigger;
            setTimeout(() => {
                elementTransformX.value = 0;
            }, 700);
        }
        props.swipeLeft.action(props.article);
    } else {
        elementTransformX.value = 0;
    }
}
</script>

<template>
    <div @click="openInReader">
        <div class="cursor-pointer w-full rounded-xl bg-background-900 overflow-hidden transition-colors relative">
            <div v-if="elementTransformX < 0" class="absolute z-0 top-0 bottom-0 w-full h-full transition-all"
                :style="{ filter: 'saturate(' + Math.min((Math.abs(elementTransformX) / swipeToTrigger) ** 2, 1) + ')', background: props.swipeLeft.color }">
                <props.swipeLeft.icon size="30"
                    class="absolute z-10 m-auto top-0 bottom-0 text-background-100 transition-left ease-linear duration-100"
                    :style="{ right: Math.min(Math.abs(elementTransformX) - 30, 50) - 20 + 'px' }" />
                <div class="absolute right-20 m-auto top-0 bottom-0 h-min font-medium">
                    {{ props.swipeLeft.name }}
                </div>
            </div>
            <div v-if="elementTransformX > 0" class="absolute z-0 top-0 bottom-0 w-full h-full transition-all"
                :style="{ filter: 'saturate(' + Math.min((Math.abs(elementTransformX) / swipeToTrigger) ** 2, 1) + ')', background: props.swipeRight.color }">
                <props.swipeRight.icon size="30"
                    class="absolute z-10 m-auto top-0 bottom-0 text-background-100 transition-left ease-linear duration-100"
                    :style="{ left: Math.min(Math.abs(elementTransformX) - 30, 50) - 20 + 'px' }" />
                <div class="absolute left-20 m-auto top-0 bottom-0 h-min font-medium">
                    {{ props.swipeRight.name }}
                </div>
            </div>
            <div @mouseenter="mouseover = true" @mouseleave="mouseover = false" v-touch:drag="swipeHandler"
                v-touch:press="pressHandler" v-touch:release="releaseHandler"
                class="w-full bg-[#222] py-4 px-5 flex flex-col gap-2 transition-transform ease-linear duration-100 relative"
                :class="{ 'brightness-75': props.article.read }"
                :style="{ transform: 'translateX(' + elementTransformX + 'px)' }">
                <Transition name="fade">
                    <div v-if="mouseover" class="absolute h-full right-2 top-0 bottom-0 flex flex-col justify-center gap-2">
                        <button :title="props.swipeRight.name" @click.stop="props.swipeRight.action(props.article)"
                            class="cursor-pointer backdrop-blur-sm bg-black/20 p-2 rounded-md hover:bg-black/40 transition-colors">
                            <props.swipeRight.icon size="20" class="text-background-100" />
                        </button>
                        <button :title="props.swipeLeft.name" @click.stop="props.swipeLeft.action(props.article)"
                            class="cursor-pointer backdrop-blur-sm bg-black/20 p-2 rounded-md hover:bg-black/40 transition-colors">
                            <props.swipeLeft.icon size="20" class="text-background-100" />
                        </button>
                    </div>
                </Transition>
                <div class="flex flex-row gap-2 items-center">
                    <ArticleSource :article="props.article" />
                    <div class="h-full flex flex-row gap-1 items-center">
                        <FileDown v-if="props.downloaded" size="16" />
                        <BookOpenCheck v-if="props.article.read" size="16" />
                        <Star v-if="props.article.starred" size="16" />
                    </div>
                </div>
                <h2 class="text-lg">{{ props.article.title }}</h2>
            </div>
        </div>
    </div>
</template>
