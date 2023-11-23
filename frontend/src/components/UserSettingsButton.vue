<script setup lang="ts">
import { UserCircle2 } from 'lucide-vue-next';
function openUserSettings() {
    console.log("openUserSettings");
}
</script>

<template>
    <button @click="openUserSettings">
        <UserCircle2 size="24" class=" text-white" />
    </button>
</template>

