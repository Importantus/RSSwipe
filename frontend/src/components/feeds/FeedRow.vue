<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Check, Tag, Trash2 } from 'lucide-vue-next'
import CategoryDots from '@/components/categories/CategoryDots.vue'
import FeedAvatar from './FeedAvatar.vue'
import { FEED_ERROR_COUNT_THRESHOLD, type FeedItem } from '@/stores/feeds'
import { hostOf } from '@/feedActions'

const SWIPE_TRIGGER_PX = 90
const LONG_PRESS_MS = 480

const props = defineProps<{
  feed: FeedItem
  /** Selection mode is on: taps toggle, swiping is off */
  selecting?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'tap'): void
  (e: 'select'): void
  (e: 'remove'): void
  (e: 'categorize'): void
}>()

const offsetX = ref(0)
const dragging = ref(false)
const hasError = computed(() => props.feed.error_count > FEED_ERROR_COUNT_THRESHOLD)

let startX = 0
let startY = 0
let tracking = false
let swiped = false
let ignoreClick = false
let pressTimer: ReturnType<typeof setTimeout> | undefined

function stopTracking() {
  tracking = false
  clearTimeout(pressTimer)
}

function onDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  startX = event.clientX
  startY = event.clientY
  tracking = true
  swiped = false
  ignoreClick = false
  if (!props.selecting) {
    pressTimer = setTimeout(() => {
      if (!tracking || swiped) return
      stopTracking()
      ignoreClick = true
      navigator.vibrate?.(10)
      emit('select')
    }, LONG_PRESS_MS)
  }
}

function onMove(event: PointerEvent) {
  if (!tracking || props.selecting) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (!swiped) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return stopTracking()
    if (Math.abs(dx) < 8) return
    swiped = true
    dragging.value = true
    clearTimeout(pressTimer)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  offsetX.value = dx
}

function onUp() {
  if (!tracking && !swiped) return
  stopTracking()
  if (!swiped) return
  ignoreClick = true
  const dx = offsetX.value
  swiped = false
  dragging.value = false
  offsetX.value = 0
  if (dx <= -SWIPE_TRIGGER_PX) {
    navigator.vibrate?.(10)
    emit('remove')
  } else if (dx >= SWIPE_TRIGGER_PX) {
    navigator.vibrate?.(10)
    emit('categorize')
  }
}

function onCancel() {
  stopTracking()
  swiped = false
  dragging.value = false
  offsetX.value = 0
}

function onClick() {
  if (ignoreClick) {
    ignoreClick = false
    return
  }
  emit('tap')
}

onBeforeUnmount(() => clearTimeout(pressTimer))
</script>

<template>
  <div class="relative overflow-hidden rounded-lg">
    <div
      class="absolute inset-0 bg-primary-700 flex items-center pl-5"
      :style="{ opacity: Math.min(Math.max(offsetX, 0) / SWIPE_TRIGGER_PX, 1) }"
    >
      <Tag :size="22" />
    </div>
    <div
      class="absolute inset-0 bg-red-600 flex items-center justify-end pr-5"
      :style="{ opacity: Math.min(Math.max(-offsetX, 0) / SWIPE_TRIGGER_PX, 1) }"
    >
      <Trash2 :size="22" />
    </div>
    <div
      class="relative flex items-center gap-3 px-4 py-3 rounded-lg bg-[#222] text-white select-none cursor-pointer"
      :class="[
        selected ? 'ring-2 ring-inset ring-primary-600' : '',
        dragging ? '' : 'transition-transform duration-200'
      ]"
      :style="{ transform: `translateX(${offsetX}px)`, touchAction: 'pan-y' }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @contextmenu.prevent
      @click="onClick"
    >
      <div class="relative flex-none" :class="{ 'error-dot error-dot-active': hasError }">
        <FeedAvatar :title="feed.title" :favicon-url="feed.faviconUrl" :size="40" />
        <span
          v-if="selected"
          class="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center"
        >
          <Check :size="12" />
        </span>
      </div>
      <div class="flex flex-col flex-1 min-w-0">
        <div class="text-base font-semibold truncate">{{ feed.title }}</div>
        <div class="text-sm text-background-500 truncate">{{ hostOf(feed.url) }}</div>
      </div>
      <CategoryDots :feed-id="feed.id" />
    </div>
  </div>
</template>
