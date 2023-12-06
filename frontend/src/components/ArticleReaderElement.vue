<script setup lang="ts">
import DOMPurify from 'dompurify';
import { useRoute } from "vue-router";
import axios from '@/axios'

const route = useRoute();
const articleId: string = route.params.id.toString();

async function getArticleContent(id: string) {
    try {
        const response = await axios.get('/articles/' + id + '/content');
        console.log(response.data);
        return response.data.content.content;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}
const data = DOMPurify.sanitize(await getArticleContent(articleId)).toString();
// const data = await getArticleContent(articleId).toString();

</script>

<template>
    <div class="h-full pb-28 overflow-y-scroll no-scrollbar">
        <div class="prose dark:prose-invert prose-a: font-light " v-html="data"></div>
    </div>
</template>