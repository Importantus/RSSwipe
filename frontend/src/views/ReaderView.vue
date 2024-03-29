<script setup lang="ts">
import { onBeforeMount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import DOMPurify from 'dompurify';
import router from '@/router';
import { useReaderStore } from '@/stores/reader';
import { fontSizes, fonts, colorSchemes } from '@/stores/reader';
import FeedLabel from '@/components/feeds/FeedLabel.vue';
import ReaderControlBar from '@/components/reader/controlBar/ReaderControlBar.vue';
import ReaderSettingsButton from '@/components/reader/settings/ReaderSettingsButton.vue';
import BlockingLoadIndicator from '@/components/global/loadingIndicators/BlockingLoadIndicator.vue';
import { MoveRight, MoveLeft } from 'lucide-vue-next';

const store = useReaderStore()

const TOLERANCE = window.innerHeight * 0.1;
const route = useRoute();

let scrollpercent = ref(0);
let lastScrollTop = 0;
let hideUi = ref(true);
let scrollFinshed = ref(false);
let backNavigationPath = ref("/");
let list = 'none' as 'none' | 'reading' | 'starred';

let templateArr: string[] =
    ["/images/articles/placeholder01.png",
        "/images/articles/placeholder02.png",
        "/images/articles/placeholder03.png",
        "/images/articles/placeholder04.png"]

let url = ref("")

function nextArticle() {
    router.push(`${backNavigationPath.value}article/${store.storedArticles[1].articleInfo.id}`);
}

function getScrollPercent(event: Event) {
    const scrollDiv = event.target as HTMLElement;
    if (scrollDiv) {
        calculateUIHide(scrollDiv);
        scrollpercent.value = (scrollDiv.scrollTop / (scrollDiv.scrollHeight - scrollDiv.clientHeight)) * 100;
        if (scrollpercent.value === 100) {
            scrollFinshed.value = true;
        } else {
            scrollFinshed.value = false;
        }
    }
}

function calculateUIHide(scrollDiv: HTMLElement | null = null) {
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

onBeforeMount(async () => {
    const listParam = route.params.list;
    if (listParam === 'readinglist') {
        list = 'reading'
        backNavigationPath.value = "/readinglist/"
    } else if (listParam === 'starredlist') {
        list = 'starred'
        backNavigationPath.value = "/starredlist/"
    }

    await store.openArticle(route.params.id.toString(), list);

    if (!store.openInApp) {
        window.open(store.storedArticles[0].articleInfo.link, '_blank');
    }

    hideUi.value = false;
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
        <div :onscroll="getScrollPercent"
            class="px-5 h-full overflow-y-scroll no-scrollbar pb-7 pt-20 transition-colors ease-out duration-500 overflow-x-hidden"
            :class="{
                'border-[#1C1204] text-[#1C1204] bg-[#C8A777]': store.settings.colorScheme.id === colorSchemes.sepia.id,
                'border-black text-black bg-white': store.settings.colorScheme.id === colorSchemes.light.id,
                'border-white text-white bg-background-950': store.settings.colorScheme.id === colorSchemes.dark.id,
            }">
            <div v-if="!store.openInApp"
                class="flex w-full h-[60vh] justify-center items-center flex-col text-background-500">
                <img src="/images/SitReadingDoodle.svg" class="w-1/2">
                Article was opened in a new tab.
            </div>
            <div v-else-if="store.storedArticles[0] && store.storedArticles[0].content && store.storedArticles[0].articleInfo"
                class="border-inherit">
                <div class="pt-5 border-b-2 border-inherit">
                    <div v-if="store.storedArticles[0].articleInfo.imageUrl"
                        class="w-full aspect-video bg-background-900 mb-5 rounded-md overflow-hidden">
                        <img :src="store.storedArticles[0].articleInfo.imageUrl"
                            class="min-h-full min-w-full after:content-none before:content-none object-cover">
                    </div>
                    <FeedLabel class="pt-2 text-white" :article="store.storedArticles[0].articleInfo" />
                    <div class="text-3xl font-semibold text-inherit py-5 break-words"
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
                <div class="border-b-2 border-inherit w-full my-5"></div>
            </div>
            <BlockingLoadIndicator v-else :show="true" class="h-full -mt-10" />
            <div v-if="store.storedArticles.length > 1 && (!store.openInApp || store.storedArticles[0] && store.storedArticles[0].content && store.storedArticles[0].articleInfo)"
                @click="nextArticle" class="border-inherit">

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
                            <FeedLabel class="mt-2 text-white" :article="store.storedArticles[1].articleInfo" />
                        </div>
                        <MoveRight size="38" class="w-1/3 ml-5 text-white" />
                    </div>
                </div>
            </div>

        </div>
        <Transition name="readerelement-hide">
            <div v-if="!hideUi" class="w-full fixed right-0 bottom-11">
                <ReaderControlBar />
            </div>
        </Transition>
    </div>
</template>

<style>
.family * {
    font-family: "Merriweather", serif;
}
</style>
