<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
  title?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.show,
  (show) => {
    if (show) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center text-white">
        <div class="absolute inset-0 bg-black/60" @click="emit('close')"></div>
        <div
          role="dialog"
          :aria-label="title"
          class="relative w-[90%] max-w-lg max-h-[88svh] flex flex-col bg-secondary-950/90 backdrop-blur-lg rounded-3xl p-5"
        >
          <div class="flex items-center gap-3 mb-4">
            <h3 class="flex-1 text-lg font-semibold truncate font-text">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button type="button" title="Close" class="flex-none" @click="emit('close')">
              <X :size="28" />
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
