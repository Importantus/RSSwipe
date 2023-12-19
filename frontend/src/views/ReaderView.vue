<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { onBeforeMount, onMounted, onUpdated, ref } from 'vue';
import DOMPurify from 'dompurify';
import FeedFilterItem from '@/components/FeedFilterItem.vue';
import ReaderFunctionElement from '@/components/ReaderFunctionElement.vue';
import { ReaderContext, ReaderStatus, useReaderStore } from '@/stores/reader';
import { MoveRight } from 'lucide-vue-next';
import { useRoute } from 'vue-router';

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
        <Transition name="titlebar-hide">
            <TitleNavigationBar v-if="!hideUi" class="mx-5" :title="store.storedArticles[0].articleInfo.title"
                :backNavigationPath="backNavigationPath" />
        </Transition>
        <div class="bottom-0 left-0 w-full h-1 bg-primary-600" :class="{ 'rounded-r-full': !scrollFinshed }"
            :style="`width: ${scrollpercent}%;`">
        </div>
        <div id="scroll" class="px-5 h-full overflow-y-scroll no-scrollbar pb-[10vh]">
            <div v-if="articleStatus === ReaderStatus.READY">
                <div class="pt-5 border-b-2">
                    <img :src="store.storedArticles[0].articleInfo.imageUrl" class="pb-5">
                    <FeedFilterItem class="mt-2" :favicon="store.storedArticles[0].articleInfo.feed.faviconUrl"
                        :title="store.storedArticles[0].articleInfo.feed.title" :noTruncate="true" />
                    <div v-html="DOMPurify.sanitize(store.storedArticles[0].articleInfo.title)"
                        class="text-3xl font-bold text-white py-5"></div>
                </div>
                <div class="prose prose-invert"
                    v-html="DOMPurify.sanitize(store.storedArticles[0].content?.content.content ?? '')">
                </div>
                <div v-if="store.storedArticles.length > 1" @click="nextArticle">
                    <div class="border-b-2 w-full mb-5"></div>
                    <h1 class="text-lg font-bold text-white my-2">Next Article:</h1>
                    <div class="bg-cover bg-black bg-opacity-80 bg-blend-overlay p-5 rounded-2xl" :style="{
                        backgroundImage: 'url(' + store.storedArticles[1].articleInfo.imageUrl + ')',
                    }">
                        <div class="flex flex-row items-center">
                            <div class="">
                                <h1 class="text-lg font-bold text-white w-fit line-clamp-2 overflow-ellipsis">
                                    {{
                                        store.storedArticles[1].articleInfo.title }}</h1>
                                <FeedFilterItem class="mt-2" :favicon="store.storedArticles[1].articleInfo.feed.faviconUrl"
                                    :title="store.storedArticles[1].articleInfo.feed.title" :noTruncate="true" />
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
        <Transition name="shareelement-hide">
            <div v-if="!hideUi" class="w-full fixed right-0 bottom-11">
                <ReaderFunctionElement />
            </div>
        </Transition>
    </div>
</template>

