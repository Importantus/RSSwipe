<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', type: 'button' }
)
</script>

<template>
  <button
    :type="type"
    class="w-full h-12 px-5 rounded-xl font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
    :class="{
      'bg-primary-600 hover:bg-primary-700 text-white': variant === 'primary',
      'bg-white/10 hover:bg-white/15 text-white': variant === 'secondary',
      'bg-red-600 hover:bg-red-700 text-white': variant === 'danger',
      'border border-red-500/60 text-red-400 hover:bg-red-500/10': variant === 'danger-outline'
    }"
  >
    <slot />
  </button>
</template>
