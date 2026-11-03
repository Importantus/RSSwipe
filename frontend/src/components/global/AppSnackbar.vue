<script setup lang="ts">
import { Undo2 } from 'lucide-vue-next'
import { useSnackbarStore } from '@/stores/snackbar'

const store = useSnackbarStore()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="store.visible"
      role="status"
      class="fixed bottom-5 left-5 right-5 max-w-xl mx-auto z-[70] flex flex-row gap-5 items-center bg-black p-5 rounded-md shadow-sm text-white"
      :class="{ 'cursor-pointer': store.undo }"
      @click="store.runUndo()"
      @mouseenter="store.pauseTimer()"
      @mouseleave="store.restartTimer()"
    >
      <div class="flex-grow font-semibold truncate">{{ store.message }}</div>
      <Undo2 v-if="store.undo" :size="24" class="text-primary-600" />
    </div>
  </Transition>
</template>
