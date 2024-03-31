<script setup lang="ts">
import { Info } from 'lucide-vue-next';


const props = defineProps<{
    description: string;
}>();

</script>

<template>
    <div>
        <div class="flex flex-row items-center gap-2 bg-background-900 rounded-t-lg px-3 py-2">
            <Info size="25"></Info>
            <p class="text-left font-thin  text-sm">Description</p>
        </div>
        <p class="bg-background-500 rounded-b-lg px-3 py-2 z-10 text-sm">{{ props.description }}</p>
    </div>
</template>