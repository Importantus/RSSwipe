<script setup lang="ts">
defineProps<{
  title?: string
  /** Explanation shown below the group */
  footer?: string
}>()
</script>

<template>
  <section>
    <h2
      v-if="title"
      class="px-1 mb-2 text-xs font-text-detail uppercase tracking-wider text-background-400"
    >
      {{ title }}
    </h2>
    <div class="bg-secondary-950 rounded-2xl overflow-hidden divide-y divide-white/5">
      <slot />
    </div>
    <p v-if="footer" class="px-1 mt-2 text-xs font-text-detail font-light leading-snug text-background-400">
      {{ footer }}
    </p>
  </section>
</template>
