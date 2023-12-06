<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import ArticleReaderElement from '@/components/ArticleReaderElement.vue';
import { useRoute } from "vue-router";

const route = useRoute();
const articleId = route.params.id.toString();




</script>

<template>
    <div class="px-5">
        <TitleNavigationBar title="" backNavigationPath="/" />
        <Suspense>
            <ArticleReaderElement :articleId="articleId" />
        </Suspense>
    </div>
</template>