<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useSettingsStore } from './stores/settings';

const store = useSettingsStore();

store.applySettings();
</script>

<template>
  <div class="max-w-xl m-auto overflow-hidden h-[100svh] relative">
    <router-view v-slot="{ Component, route }">
      <transition :name="(route.meta.transition as string)">
        <component class="absolute w-full h-full bg-background-950" :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
