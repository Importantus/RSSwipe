<script setup lang="ts">
import { onBeforeMount, onMounted, onUpdated, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import ArticleSource from '@/components/ArticleSource.vue';
import ReaderFunctionElement from '@/components/ReaderFunctionElement.vue';
import { ReaderContext, ReaderStatus, useReaderStore } from '@/stores/reader';
import { MoveRight, MoveLeft } from 'lucide-vue-next';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router';
import { fontSizes, fonts, colorSchemes } from '@/stores/reader';
import ReaderSettingsButton from '@/components/Reader/FunctionBar/ReaderSettingsButton.vue';
import router from '@/router';

const TOLERANCE = window.innerHeight * 0.1;
const route = useRoute();

const store = useReaderStore()

let scrollDiv: HTMLElement | null
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

onBeforeRouteUpdate(async (to, from, next) => {
    if (to.params.id !== from.params.id) {
        await store.openArticle(to.params.id.toString());
        hideUi.value = false;

        // set window state to current article
        window.history.replaceState({ back: from.path }, "");

        next();
    }
});

onBeforeMount(async () => {
    await store.openArticle(route.params.id.toString());
    hideUi.value = false;
    backNavigationPath.value = window.history.state?.back === "/readinglist" ? "/readinglist" : "/";
});

onMounted(async () => {
    scrollDiv = document.getElementById("scroll");
    if (scrollDiv) {
        scrollDiv.addEventListener('scroll', getScrollPercent);
    }
});

watch(() => store.storedArticles, (newVal) => {
    if (newVal.length > 0) {
        hideUi.value = false;
    }
    if (!store.storedArticles[1] || !store.storedArticles[1].articleInfo.imageUrl) {
        url.value = templateArr[Math.floor(Math.random() * templateArr.length)];
    } else {
        url.value = store.storedArticles[1].articleInfo.imageUrl
    }
}, { deep: true });

function nextArticle() {
    const FADEOUT_TIME = 200;
    const FADEIN_TIME = 100;
    if (scrollDiv) {
        scrollDiv.scrollTo({ top: 0, behavior: 'smooth' });
        scrollDiv.style.transition = 'opacity ' + FADEOUT_TIME + 'ms';
        scrollDiv.style.opacity = '0';
        setTimeout(() => {
            if (scrollDiv) {
                scrollDiv.style.transition = 'opacity' + FADEIN_TIME + 'ms';
                scrollDiv.style.opacity = '100';
                router.push(`/article/${store.storedArticles[1].articleInfo.id}`);
            }
        }, FADEOUT_TIME);
    }
}

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
                    class="flex flex-row items-center justify-between px-5 z-10 bg-background-950 backdrop-blur-md bg-opacity-70 transition-all ease-out duration-300"
                    :class="{ 'py-5': scrollpercent < 1, 'py-2': scrollpercent >= 1 }">
                    <div class="flex flex-row items-center w-[80%]">
                        <router-link :to="backNavigationPath">
                            <MoveLeft size="24" class=" text-inherit" />
                        </router-link>
                        <h1 v-if="store.storedArticles[0]" class="truncate ... text-2xl font-bold text-inherit ml-2">{{
                            store.storedArticles[0].articleInfo.title }}</h1>
                    </div>
                    <div class="flex flex-row items-center flex-shrink-0">
                        <ReaderSettingsButton />
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
            <div v-if="store.storedArticles[0] && store.storedArticles[0].content && store.storedArticles[0].articleInfo"
                class="border-inherit">
                <div class="pt-5 border-b-2 border-inherit">
                    <div v-if="store.storedArticles[0].articleInfo.imageUrl"
                        class="w-full aspect-video bg-background-900 mb-5 rounded-md overflow-hidden">
                        <img :src="store.storedArticles[0].articleInfo.imageUrl"
                            class="min-h-full min-w-full after:content-none before:content-none">
                    </div>
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
                    <div class="border-b-2 border-inherit w-full my-5"></div>
                    <h1 class="text-lg font-bold text-inherit my-2">Next Article:</h1>
                    <div :style="{ backgroundImage: 'url(' + url + ')' }"
                        class="cursor-pointer bg-cover bg-blend-overlay p-5 rounded-2xl" :class="{
                            'bg-[#5c4e38] bg-opacity-80': store.settings.colorScheme.id === colorSchemes.sepia.id,
                            'bg-black bg-opacity-20': store.settings.colorScheme.id === colorSchemes.light.id,
                            'bg-background-950 bg-opacity-75': store.settings.colorScheme.id === colorSchemes.dark.id,
                        }">
                        <div class="flex flex-row items-center">
                            <div class="">
                                <h1 class="text-lg font-bold text-white w-fit line-clamp-2 overflow-ellipsis">
                                    {{ store.storedArticles[1].articleInfo.title }}</h1>
                                <ArticleSource class="mt-2 text-white" :article="store.storedArticles[1].articleInfo" />
                            </div>
                            <MoveRight size="38" class="w-1/3 ml-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="flex items-center justify-center h-full pb-[20vw]">
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