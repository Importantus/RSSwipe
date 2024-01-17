<script setup lang="ts">
import HomeTopWrapper from '@/components/home/HomeTopWrapper.vue';
import HomeMiddleWrapper from '@/components/home/HomeMiddleWrapper.vue';
import HomeBottomWrapper from '@/components/home/HomeBottomWrapper.vue';
import UndoButtonVue from '@/components/home/UndoButton.vue';
import { useStartPageStore } from '@/stores/startPage';

const store = useStartPageStore()
</script>

<template>
  <div class="flex flex-col gradient h-full px-5 pt-5 gap-5">
    <HomeTopWrapper />
    <HomeMiddleWrapper class="h-full" />
    <div class="mb-10 mt-4 relative">
      <HomeBottomWrapper />
      <UndoButtonVue v-if="store.lastActions.length > 0" class="absolute right-5 m-auto top-0 bottom-0" />
    </div>
  </div>
</template>

<style scoped>
.gradient {
  background: radial-gradient(114.56% 50% at 50% 50%, #3d3d3d 0%, #101010 81.77%);
}
</style>