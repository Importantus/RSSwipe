<script setup lang="ts">
import AppModal from '@/components/global/AppModal.vue'
import CategoryForm from './CategoryForm.vue'
import type { FeedCategory } from '@/stores/feedCategories'

defineProps<{ category: FeedCategory | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <AppModal :show="!!category" title="Edit category" @close="emit('close')">
    <CategoryForm v-if="category" :key="category.id" :category="category" @done="emit('close')" />
  </AppModal>
</template>
