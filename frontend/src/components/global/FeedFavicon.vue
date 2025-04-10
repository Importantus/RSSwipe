<script setup lang="ts">
const props = defineProps<{
    url?: string
}>()

let templateArr: string[] =
    ["/images/articles/placeholder01.png",
        "/images/articles/placeholder02.png",
        "/images/articles/placeholder03.png",
        "/images/articles/placeholder04.png"]
</script>


<template>
    <object :data="props.url" alt="favicon" class="flex justify-center items-center min-w-full min-h-full object-cover">
        <img :src="templateArr[Math.round((templateArr.length - 1) * Math.random())]" alt="favicon"
            class="relative min-w-full min-h-full object-cover" />
    </object>
</template>
