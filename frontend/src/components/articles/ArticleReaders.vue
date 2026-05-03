<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createAvatar } from '@dicebear/core'
import { lorelei, pixelArtNeutral, rings, thumbs } from '@dicebear/collection'
import type { ArticleReader } from '@/types'

const props = defineProps<{
  readers?: ArticleReader[]
}>()

const isExpanded = ref(false)

const containerRef = ref<HTMLElement | null>(null)

const displayReaders = computed(() => props.readers?.slice(0, 3) || [])
const extraCount = computed(() => Math.max(0, (props.readers?.length || 0) - 3))

const getAvatarUri = (seed: string) => {
  const avatar = createAvatar(thumbs, {
    seed: seed,
    size: 32
  })
  return avatar.toDataUri()
}

function toggleNames() {
  isExpanded.value = !isExpanded.value
}

function handleClickOutside(event: Event) {
  if (
    isExpanded.value &&
    containerRef.value &&
    !containerRef.value.contains(event.target as Node)
  ) {
    isExpanded.value = false
    event.stopPropagation()
    event.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, { capture: true })
  document.addEventListener('touchstart', handleClickOutside, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, { capture: true })
  document.removeEventListener('touchstart', handleClickOutside, { capture: true })
})
</script>

<template>
  <div
    v-if="readers && readers.length > 0"
    class="relative w-fit"
    @click.stop="toggleNames"
    ref="containerRef"
  >
    <div
      class="flex items-center rounded-lg w-fit cursor-pointer transition-colors"
      :class="{ 'bg-opacity-80': isExpanded }"
    >
      <div class="flex -space-x-1.5">
        <img
          v-for="reader in displayReaders"
          :key="reader.user.id"
          :src="getAvatarUri(reader.user.id)"
          class="w-6 h-6 rounded-full border border-background-800 bg-background-900"
          alt="Reader Avatar"
        />
      </div>

      <span v-if="extraCount > 0" class="ml-1.5 text-xs text-white font-text-detail font-semibold">
        +{{ extraCount }}
      </span>
    </div>

    <Transition name="fade">
      <div
        v-if="isExpanded"
        class="absolute top-full mt-1 right-0 bg-background-900 bg-opacity-60 backdrop-blur-md p-2 rounded-xl text-xs font-text-detail text-white flex flex-col gap-2 min-w-max shadow-xl z-50 border border-white/10"
      >
        <div v-for="reader in readers" :key="reader.user.id" class="flex items-center gap-2">
          <img :src="getAvatarUri(reader.user.id)" class="w-6 h-6 rounded-full bg-background-800" />
          <span class="font-medium text-sm">{{ reader.user.name }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
