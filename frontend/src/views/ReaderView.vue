<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { useRoute } from "vue-router";
import { onMounted, ref } from 'vue';
import axios from '@/axios';
import router from '@/router';
import DOMPurify from 'dompurify';
import FeedFilterItem from '@/components/FeedFilterItem.vue';
import ReaderFunctionElement from '@/components/ReaderFunctionElement.vue';

enum ArticleStatus {
    LOADING,
    READY,
    ERROR,
}

const TOLERANCE = window.innerHeight * 0.1;

const route = useRoute();
const articleId = route.params.id.toString();
let content = ref("");
let article = ref({} as Article)
let articleStatus = ref(ArticleStatus.LOADING);
let scrollpercent = ref(0);
let lastScrollTop = 0;
let hideUi = ref(false);

onMounted(async () => {
    await getArticle();
    await getArticleContent();
    const scrollDiv = document.getElementById("scroll");
    if (scrollDiv) {
        scrollDiv.addEventListener('scroll', getScrollPercent);
    }

});

async function getArticle() {
    try {
        const response = await axios.get(`/articles/${articleId}`);
        article.value = response.data;
    } catch (e: any) {
        console.log("Fehler: " + e);
        router.push("/articlenotfound");
    }
}

async function getArticleContent() {
    try {
        const response = await axios.get(`/articles/${articleId}/content`);
        content.value = response.data.content.content;
        articleStatus.value = ArticleStatus.READY;
    } catch (e: any) {
        console.log("Fehler: " + e);
        router.push("/articlenotfound");
    }
}

//get scroll position
function getScrollPercent() {
    const scrollDiv = document.getElementById("scroll");
    if (scrollDiv) {
        calculateUIHide();
        scrollpercent.value = (scrollDiv.scrollTop / (scrollDiv.scrollHeight - scrollDiv.clientHeight)) * 100;
    }
}

function calculateUIHide() {
    const scrollDiv = document.getElementById("scroll");
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
            <TitleNavigationBar v-if="!hideUi" class="mx-5" :title="article.title" backNavigationPath="/" />
        </Transition>
        <div class="bottom-0 left-0 w-full h-1 rounded-r-full bg-primary-600" :style="`width: ${scrollpercent}%;`">
        </div>
        <div id="scroll" class="px-5 h-full overflow-y-scroll no-scrollbar pb-24">
            <div v-if="articleStatus === ArticleStatus.READY">
                <div class="pt-5 border-b-2">
                    <img :src="article.imageUrl" class="pb-5">
                    <FeedFilterItem class="mt-2" :favicon="article.feed.faviconUrl" :title="article.feed.title"
                        :noTruncate="true" />
                    <div v-html="DOMPurify.sanitize(article.title)" class="text-3xl font-bold text-white py-5"></div>
                </div>
                <div class="prose prose-invert" v-html="DOMPurify.sanitize(content)">
                </div>
            </div>
            <div v-else-if="articleStatus === ArticleStatus.LOADING"
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