<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { ref } from 'vue';

let starred = ref(false);

function toggleStar() {
    console.log("toggleStar");
    starred.value = !starred.value;
}

</script>

<template>
    <button class="rounded-full" @click="toggleStar">
        <Star size="28" class=" text-white m-3" :class="{ 'fill-white': starred || false }" />
    </button>
</template>
