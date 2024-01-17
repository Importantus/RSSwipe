<script setup lang="ts">
import type { Article } from '@/types';

const props = defineProps<{
    article: Article;

}>()
const date = new Date(props.article.publishedAt);
let dateString = isTodayOrYesterday(date);



function isTodayOrYesterday(dateToCheck: Date): string {
    const today = new Date();
    const yesterday = new Date();
    const tempdate = new Date(dateToCheck);
    yesterday.setDate(today.getDate() - 1);
    console.log(dateToCheck);
    // Set hours, minutes, seconds, and milliseconds to 0 for both dates
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    tempdate.setHours(0, 0, 0, 0);
    console.log(dateToCheck);

    if (tempdate.getDate() === today.getDate()) {
        return 'Today at ' + dateToCheck.toTimeString().slice(0,5);
    } else if (tempdate.getDate() === yesterday.getDate()) {
        return 'Yesterday at '+ dateToCheck.toTimeString().slice(0,5);
    } else {
        return date.toLocaleString(undefined, {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
    });
}
}


</script>
<template>
    <div class=" font-text-detail top-3 left-3 bg-background-900 bg-opacity-50 px-2 py-1 text-xs rounded-lg">
        {{ dateString }}
    </div>
</template>