<script setup lang="ts">
import router from '@/router';
import { UserCircle2 } from 'lucide-vue-next';
function openUserSettings() {
    router.push({ name: 'Account' });
}
</script>

<template>
    <button @click="openUserSettings">
        <UserCircle2 size="24" class=" text-white" />
    </button>
</template>

