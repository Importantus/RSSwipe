<script setup lang="ts">
import { ref } from 'vue'
import type { Article } from '@/types'
import CategoryDots from '@/components/categories/CategoryDots.vue'
import FeedAvatar from './FeedAvatar.vue'
import FeedDetailModal from './FeedDetailModal.vue'

const props = defineProps<{
  article: Article
}>()

const open = ref(false)
</script>

<template>
  <div>
    <button
      type="button"
      class="flex flex-row w-fit rounded-md p-2 gap-2 items-center bg-secondary-900 bg-opacity-60 max-w-[16rem] text-left"
      @click.stop="open = true"
    >
      <FeedAvatar :title="article.feed.title" :favicon-url="article.feed.faviconUrl" :size="16" rounded="rounded-sm" />
      <p class="font-text-detail font-light text-xs text-opacity-60 truncate">{{ article.feed.title }}</p>
      <CategoryDots :feed-id="article.feed.id" />
    </button>
    <FeedDetailModal
      :feed-id="open ? props.article.feed.id : null"
      :fallback="{
        title: props.article.feed.title,
        link: props.article.feed.link,
        faviconUrl: props.article.feed.faviconUrl,
        description: props.article.feed.description
      }"
      @close="open = false"
    />
  </div>
</template>
