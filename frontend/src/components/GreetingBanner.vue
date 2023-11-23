<script setup lang="ts">
defineProps<{
    greeting: string
}>()
</script>

<template>
    <div class="text-2xl text-center ">
        <h1 class>{{ greeting }}</h1>
    </div>
</template>
