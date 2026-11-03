<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    unit?: string
    label?: string
  }>(),
  { min: 0, max: 999, step: 1 }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()

function set(value: number) {
  const next = Math.min(props.max, Math.max(props.min, Math.round(value)))
  if (next !== props.modelValue) emit('update:modelValue', next)
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  const digits = target.value.replace(/[^0-9]/g, '').slice(0, String(props.max).length)
  target.value = digits
  if (digits !== '') set(Number(digits))
}

function onBlur(event: Event) {
  ;(event.target as HTMLInputElement).value = String(props.modelValue)
}
</script>

<template>
  <div class="flex items-center gap-1 flex-none" role="group" :aria-label="label">
    <button
      type="button"
      title="Decrease"
      class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center transition active:scale-90 disabled:opacity-30"
      :disabled="modelValue <= min"
      @click="set(modelValue - step)"
    >
      <Minus :size="16" />
    </button>
    <div class="flex items-baseline justify-center gap-1 min-w-[3.5rem]">
      <input
        :value="modelValue"
        type="text"
        inputmode="numeric"
        :aria-label="label"
        class="w-10 !p-0 text-center bg-transparent font-text-detail font-semibold text-lg tabular-nums"
        @input="onInput"
        @blur="onBlur"
      />
      <span v-if="unit" class="text-xs font-text-detail text-background-400">{{ unit }}</span>
    </div>
    <button
      type="button"
      title="Increase"
      class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center transition active:scale-90 disabled:opacity-30"
      :disabled="modelValue >= max"
      @click="set(modelValue + step)"
    >
      <Plus :size="16" />
    </button>
  </div>
</template>
