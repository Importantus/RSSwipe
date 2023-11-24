<script setup lang="ts">
import router from '@/router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

function handleLogout() {
    authStore.logout();
    router.push('/');
}
</script>

<template>
    <button @click="handleLogout"
        class="w-full h-14 bg-amber-600 rounded-lg mt-10 hover:bg-amber-700 transition">Logout</button>
</template>