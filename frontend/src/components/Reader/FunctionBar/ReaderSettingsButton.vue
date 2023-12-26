<script setup lang="ts">
import { Settings2, X } from 'lucide-vue-next'
import { ref } from 'vue';
import ReaderSettings from '../ReaderSettings.vue';

const showSettings = ref(false);

// Close settings when clicking outside of the settings
window.addEventListener('click', (e) => {
    if (showSettings.value) {
        const target = e.target as HTMLElement;
        if (!target.closest('.ReaderSettings')) {
            showSettings.value = false;
        }
    }
});
</script>

<template>
    <div class="relative ReaderSettings">
        <Transition name="readersettings">
            <ReaderSettings v-if="showSettings" class="fixed top-24 right-1" />
        </Transition>
        <Settings2 @click="showSettings = !showSettings" :size="28" class="m-3"
            :class="{ 'hidden transform duration-200 ease-linear': showSettings }" />
        <X v-if="showSettings" @click="showSettings = !showSettings" :size="28" class="m-3" />
    </div>
</template>