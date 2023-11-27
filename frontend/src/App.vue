<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="max-w-md m-auto overflow-hidden h-screen relative">
    <router-view v-slot="{ Component, route }">
      <transition :name="(route.meta.transition as string)">
        <component class="absolute w-full h-screen bg-background-950" :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
