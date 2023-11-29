<script setup lang="ts">
import HomeTopWrapper from '@/components/home/HomeTopWrapper.vue';
import HomeMiddleWrapper from '@/components/home/HomeMiddleWrapper.vue';
import HomeBottomWrapper from '@/components/home/HomeBottomWrapper.vue';
</script>

<template>
  <div class="flex flex-col gradient h-screen px-5 pt-5">
    <HomeTopWrapper />
    <HomeMiddleWrapper class="flex-1 pb-40" />
    <div class="w-full fixed right-0 bottom-11">
      <HomeBottomWrapper />
    </div>
  </div>
</template>

<style scoped>
.gradient {
  background: radial-gradient(114.56% 50% at 50% 50%, #3d3d3d 0%, #101010 81.77%);
}
</style>