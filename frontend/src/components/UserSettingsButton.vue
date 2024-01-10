<script setup lang="ts">
import router from '@/router';
import { Settings } from 'lucide-vue-next';
function openUserSettings() {
    router.push({ name: 'Settings' });
}
</script>

<template>
    <button @click="openUserSettings" title="User setting">
        <Settings size="24" class=" text-white"/>
    </button>
</template>

