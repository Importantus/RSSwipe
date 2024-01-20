<script setup lang="ts">
import type { Article } from '@/types';

const props = defineProps<{
    article: Article;
}>()

const date = new Date(props.article.publishedAt);
let dateString = isTodayOrYesterday(date);

function isTodayOrYesterday(dateToCheck: Date): string {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const diff = Math.floor((today.getTime() - dateToCheck.getTime()) / 1000 / 60);

    if (diff < 60) {
        if (diff < 1) {
            return 'Just now';
        } else {
            return diff + ' minutes ago';
        }
    }

    if (diff < 60 * 24) {
        const hours = Math.floor(diff / 60);
        return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
    }

    if (dateToCheck.getDate() === yesterday.getDate()) {
        return 'Yesterday at ' + dateToCheck.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: 'numeric',
        });
    }

    return dateToCheck.toLocaleString(undefined, {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    });
}
</script>

<template>
    <div class="font-text-detail bg-background-900 bg-opacity-50 px-2 py-1 text-xs rounded-lg w-fit">
        {{ dateString }}
    </div>
</template>
