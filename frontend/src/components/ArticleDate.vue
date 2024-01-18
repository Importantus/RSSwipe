<script setup lang="ts">
import type { Article } from '@/types';

const props = defineProps<{
    article: Article;
}>()

const date = new Date(props.article.publishedAt);
let dateString = isTodayOrYesterday(date);

function isTodayOrYesterday(dateToCheck: Date): string {
    const today = new Date();
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const diff = Math.floor((today.getTime() - dateToCheck.getTime()) / 1000 / 60);
    console.log(today.getDate() - 1)
    if (diff / 60 < 24) {
        if (diff < 1) {
            return 'Just now';
        }
        if (diff < 60) {
            return diff + ' minutes ago';
        } else {
            return Math.floor(diff / 60) + ' hour' + (Math.floor(diff / 60) === 1 ? "" : "s") + ' ago';
        }
    } else if (dateToCheck.getDate() === yesterday.getDate()) {
        return 'Yesterday at ' + dateToCheck.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: 'numeric',
        });
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
    <div class="font-text-detail bg-background-900 bg-opacity-50 px-2 py-1 text-xs rounded-lg w-fit">
        {{ dateString }}
    </div>
</template>