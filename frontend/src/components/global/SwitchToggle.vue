<script setup lang="ts">
defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :title="title"
    class="relative w-11 h-6 rounded-full flex-none transition"
    :class="modelValue ? 'bg-primary-800' : 'bg-background-900'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-all"
      :class="modelValue ? 'translate-x-5 bg-primary-500' : 'bg-background-500'"
    ></span>
  </button>
</template>
