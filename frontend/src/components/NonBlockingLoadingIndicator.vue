<script lang="ts" setup>

const props = defineProps<{
    show: boolean
}>()

</script>

<template>
    <div v-if="props.show" class="w-full h-2 fixed top-0 left-0 animated-gradient"></div>
</template>

<style scoped>
.animated-gradient {
    background: linear-gradient(270deg, #CF6A31 0%, #4E2915 50%, #CF6A31 50%, #4E2915 100%);
    background-size: 200% 100%;
    animation: gradient 1s ease infinite;
}

@keyframes gradient {
    0% {
        background-position: 100% 0%;
    }

    100% {
        background-position: 0% 0%;
    }
}
</style>