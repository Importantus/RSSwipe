<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { onBeforeMount, onMounted, onUpdated, ref } from 'vue';
import DOMPurify from 'dompurify';
import ArticleSource from '@/components/ArticleSource.vue';
import ReaderFunctionElement from '@/components/ReaderFunctionElement.vue';
import { ReaderContext, ReaderStatus, useReaderStore } from '@/stores/reader';
import { MoveRight, MoveLeft } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import { fontSizes, fonts, colorSchemes } from '@/stores/reader';

const TOLERANCE = window.innerHeight * 0.1;
const route = useRoute();
const articleId = route.params.id.toString();

const store = useReaderStore()

let scrollDiv: HTMLElement | null
let articleStatus = ref(store.status);
let scrollpercent = ref(0);
let lastScrollTop = 0;
let hideUi = ref(true);
let scrollFinshed = ref(false);
let backNavigationPath = ref("/");

let templateArr: string[] =
    ["/images/articles/placeholder01.png",
        "/images/articles/placeholder02.png",
        "/images/articles/placeholder03.png",
        "/images/articles/placeholder04.png"]

let url = ref("")

onBeforeMount(async () => {
    console.log("current store: " + store.storedArticles.length)
    if (store.storedArticles.length === 0) {
        articleStatus.value = ReaderStatus.LOADING;
        await store.openArticleFromId(articleId);
        articleStatus.value = ReaderStatus.READY;
        hideUi.value = false;
    }
});

onMounted(async () => {
    scrollDiv = document.getElementById("scroll");
    if (scrollDiv) {
        scrollDiv.addEventListener('scroll', getScrollPercent);
    }
    if (store.storedArticles.length > 0) {
        hideUi.value = false;
    }

    switch (store.ReaderContext) {
        case ReaderContext.STARTPAGE:
            backNavigationPath.value = "/";
            break;
        case ReaderContext.READINGLIST:
            backNavigationPath.value = "/readinglist";
            break;
    }

});

onUpdated(() => {
    if (!store.storedArticles[1] || !store.storedArticles[1].articleInfo.imageUrl) {
        url.value = templateArr[Math.floor(Math.random() * templateArr.length)];
        console.log("image url: " + url.value)
    } else {
        url.value = store.storedArticles[1].articleInfo.imageUrl
    }
})

function nextArticle() {
    const FADEOUT_TIME = 200;
    const FADEIN_TIME = 100;
    if (scrollDiv) {
        console.log("nextArticle")
        scrollDiv.scrollTo({ top: 0, behavior: 'smooth' });
        scrollDiv.style.transition = 'opacity ' + FADEOUT_TIME + 'ms';
        scrollDiv.style.opacity = '0';
        setTimeout(() => {
            if (scrollDiv) {
                scrollDiv.style.transition = 'opacity' + FADEIN_TIME + 'ms';
                scrollDiv.style.opacity = '100';
                store.nextArticle();
            }
        }, FADEOUT_TIME);
    }
}

//get scroll position
function getScrollPercent() {
    if (scrollDiv) {
        calculateUIHide();
        scrollpercent.value = (scrollDiv.scrollTop / (scrollDiv.scrollHeight - scrollDiv.clientHeight)) * 100;
        if (scrollpercent.value === 100) {
            scrollFinshed.value = true;
        } else {
            scrollFinshed.value = false;
        }
    }
}

function calculateUIHide() {
    if (scrollDiv) {
        if (lastScrollTop < scrollDiv.scrollTop) {
            if (scrollDiv.scrollTop - lastScrollTop > TOLERANCE) {
                lastScrollTop = scrollDiv.scrollTop - (TOLERANCE + 1);
                hideUi.value = true
            }
        } else {
            lastScrollTop = scrollDiv.scrollTop;
            hideUi.value = false
        }
    }
}

</script>

<template>
    <div>
        <div class="fixed top-0 right-0 left-0 m-auto w-full max-w-xl">
            <Transition name="readerbar-hide">
                <div v-if="!hideUi"
                    class="flex flex-row items-center justify-between py-5 px-5 z-10 bg-background-950 backdrop-blur-md bg-opacity-70">
                    <div class="flex flex-row items-center w-full">
                        <router-link :to="backNavigationPath">
                            <MoveLeft size="24" class=" text-inherit" />
                        </router-link>
                        <h1 class="truncate ... max-width-full text-2xl font-bold text-inherit ml-2">{{
                            store.storedArticles[0].articleInfo.title }}</h1>
                    </div>
                    <div class="flex flex-row items-center">
                        <slot></slot>
                    </div>
                </div>
            </Transition>
            <div class="bottom-0 left-0 w-full h-1 bg-primary-600" :class="{ 'rounded-r-full': !scrollFinshed }"
                :style="`width: ${scrollpercent}%;`">
            </div>
        </div>
        <div id="scroll"
            class="px-5 h-full overflow-y-scroll no-scrollbar pb-[10vh] pt-20 transition-colors ease-out duration-500"
            :class="{
                'border-[#1C1204] text-[#1C1204] bg-[#C8A777]': store.settings.colorScheme.id === colorSchemes.sepia.id,
                'border-black text-black bg-white': store.settings.colorScheme.id === colorSchemes.light.id,
                'border-white text-white bg-background-950': store.settings.colorScheme.id === colorSchemes.dark.id,
            }">
            <div v-if="articleStatus === ReaderStatus.READY" class="border-inherit">
                <div class="pt-5 border-b-2 border-inherit">
                    <img :src="store.storedArticles[0].articleInfo.imageUrl" class="pb-5 rounded-md">
                    <ArticleSource class="pt-2 text-white" :article="store.storedArticles[0].articleInfo" />
                    <div class="text-3xl font-semibold text-inherit py-5"
                        :class="{ 'font-title': store.settings.font.id === fonts.serif.id }">{{
                            store.storedArticles[0].articleInfo.title
                        }}
                    </div>
                </div>
                <div class="prose transition-all ease-linear duration-200" :class="{
                            'family': store.settings.font.id === fonts.serif.id,
                            'prose-invert': store.settings.colorScheme.id === colorSchemes.dark.id,
                            'prose-sm': store.settings.fontSize.id === fontSizes.small.id,
                            'prose-lg': store.settings.fontSize.id === fontSizes.large.id
                        }" v-html="DOMPurify.sanitize(store.storedArticles[0].content?.content.content ?? '')">
                </div>
                <div v-if="store.storedArticles.length > 1" @click="nextArticle" class="border-inherit">
                    <div class="border-b-2 border-inherit w-full mb-5"></div>
                    <h1 class="text-lg font-bold text-inherit my-2">Next Article:</h1>
                    <div class="bg-cover bg-black bg-opacity-80 bg-blend-overlay p-5 rounded-2xl" :style="{
                        backgroundImage: 'url(' + url + ')',
                    }">
                        <div class="flex flex-row items-center">
                            <div class="">
                                <h1 class="text-lg font-bold text-white w-fit line-clamp-2 overflow-ellipsis">
                                    {{
                                        store.storedArticles[1].articleInfo.title }}</h1>
                                <ArticleSource class="mt-2 text-white" :article="store.storedArticles[1].articleInfo" />
                            </div>
                            <MoveRight size="38" class="w-1/3 ml-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="articleStatus === ReaderStatus.LOADING"
                class="flex items-center justify-center h-full pb-[20vw]">
                <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        </div>
        <Transition name="readerelement-hide">
            <div v-if="!hideUi" class="w-full fixed right-0 bottom-11">
                <ReaderFunctionElement />
            </div>
        </Transition>
    </div>
</template>

<style>
.family * {
    font-family: "Merriweather", serif;
}
</style>