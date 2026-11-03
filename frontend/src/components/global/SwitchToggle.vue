<script setup lang="ts">
defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="title"
    :title="title"
    class="relative w-12 h-7 rounded-full flex-none transition-colors duration-200"
    :class="modelValue ? 'bg-primary-600' : 'bg-secondary-600'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="absolute top-0.5 left-0.5 h-6 w-6 rounded-full shadow transition-all duration-200"
      :class="modelValue ? 'translate-x-5 bg-white' : 'translate-x-0 bg-secondary-200'"
    ></span>
  </button>
</template>
