<script setup lang="ts">
import { colorOf } from './categoryColors'

defineProps<{ color: string; ring?: boolean }>()
</script>

<template>
  <span
    class="inline-block w-2 h-2 rounded-full flex-none"
    :class="{ 'ring-1 ring-white/70': ring }"
    :style="{ background: colorOf(color) }"
  ></span>
</template>
