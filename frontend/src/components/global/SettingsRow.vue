<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  description?: string
  icon?: Component
  /** Renders the row as a link with a chevron */
  to?: string
  /** Renders the row as a tappable button */
  button?: boolean
  danger?: boolean
  disabled?: boolean
}>()

const tag = computed(() => (props.to ? RouterLink : props.button ? 'button' : 'div'))
const interactive = computed(() => !!props.to || props.button)
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="button ? 'button' : undefined"
    class="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left transition-colors"
    :class="[
      interactive ? 'active:bg-white/5 cursor-pointer' : '',
      disabled ? 'opacity-40 pointer-events-none' : '',
      danger ? 'text-red-400' : ''
    ]"
  >
    <component
      :is="icon"
      v-if="icon"
      :size="20"
      class="flex-none"
      :class="danger ? 'text-red-400' : 'text-primary-400'"
    />
    <div class="flex-1 min-w-0">
      <div class="leading-snug">{{ title }}</div>
      <div v-if="description" class="mt-0.5 text-xs font-text-detail font-light leading-snug text-background-400">
        {{ description }}
      </div>
    </div>
    <slot />
    <ChevronRight v-if="to" :size="18" class="flex-none text-background-500 -mr-1" />
  </component>
</template>
