<script setup lang="ts">
import HomeTopWrapper from '@/components/home/HomeTopWrapper.vue';
import HomeMiddleWrapper from '@/components/home/HomeMiddleWrapper.vue';
import HomeBottomWrapper from '@/components/home/HomeBottomWrapper.vue';
</script>

<template>
  <main>
    <div class="flex flex-col bg-gradient-radial from-background-900 to-background-950 h-screen px-5">
      <HomeTopWrapper />
      <HomeMiddleWrapper class="flex-1 pb-40" />
      <div class="w-full fixed right-0 bottom-12">
        <HomeBottomWrapper />
      </div>
    </div>
  </main>
</template>
