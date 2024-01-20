<script setup lang="ts">
import { ref, watch } from 'vue'
import { Undo2 } from 'lucide-vue-next';

const props = defineProps<{
    message: string,
    watch: number,
    undo: () => void
}>()

let showTile = ref(false)
let timeout: ReturnType<typeof setTimeout> | undefined

watch(() => props.watch, (newValue, oldValue) => {
    if (newValue > oldValue) {
        showTile.value = true
        clearDelay()
        timeout = setTimeout(() => {
            showTile.value = false;
        }, 5000);
    }
});

function clearDelay() {
    if (timeout) {
        clearTimeout(timeout)
    }
}

function reAddDelay() {
    clearDelay()
    timeout = setTimeout(() => {
        showTile.value = false;
    }, 5000);
}
</script>

<template>
    <Transition name="fade">
        <div v-if="showTile" @click="() => {
            props.undo()
            showTile = false
        }" class=" fixed bottom-5 left-5 right-5 flex flex-row gap-5 bg-black p-5 rounded-md shadow-sm cursor-pointer"
            @mouseenter="clearDelay" @mouseleave="reAddDelay">
            <div class=" flex-grow font-semibold">
                {{ message }}
            </div>
            <Undo2 size="24" class=" text-primary-600" />
        </div>
    </Transition>
</template>
    