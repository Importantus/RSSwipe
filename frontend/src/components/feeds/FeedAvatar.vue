<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    faviconUrl?: string | null
    size?: number
    /** Tailwind radius class */
    rounded?: string
  }>(),
  { size: 40, rounded: 'rounded' }
)

const failed = ref(false)
const hue = computed(() => [...props.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7))
const showImage = computed(() => !!props.faviconUrl && !failed.value)
</script>

<template>
  <span
    class="flex-none flex items-center justify-center overflow-hidden font-text-detail font-semibold"
    :class="rounded"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.round(size * 0.42) + 'px',
      background: showImage ? 'transparent' : `hsl(${hue} 35% 26%)`,
      color: `hsl(${hue} 65% 78%)`
    }"
  >
    <img
      v-if="showImage"
      :src="faviconUrl!"
      alt=""
      class="min-w-full min-h-full object-cover"
      @error="failed = true"
    />
    <template v-else>{{ title.charAt(0).toUpperCase() }}</template>
  </span>
</template>
