<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { useSettingsStore } from '@/stores/settings';
import { useUserdataStore } from '@/stores/userdata';
import { MoveRight } from 'lucide-vue-next';
import { computed } from 'vue';


const userStore = useUserdataStore();
const settingsStore = useSettingsStore();

const fontFactor = computed({
    get: () => settingsStore.settings.fontFactor,
    set: (value) => {
        settingsStore.updateFontFactor(value);
    }
});

userStore.fetchUserData();
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Settings" backNavigationPath="/" />
        <div class="flex flex-col gap-10">
            <div class="flex py-5 px-5 justify-between items-center bg-background-900 bg-opacity-20 rounded-md">
                <div class="flex flex-col gap-1">
                    <h2 class="font-title text-2xl">{{ userStore.userdata.name }}</h2>
                    <p class="font-title font-light text-background-300">{{ userStore.userdata.email }}</p>
                </div>
                <router-link to="/settings/account"
                    class="bg-background-900 py-2 px-4 rounded-md opacity-70 hover:shadow-lg flex gap-2 items-center">
                    Edit
                    <MoveRight :size="16" class="mt-[1px]" />
                </router-link>
            </div>
            <div class="flex flex-col gap-5">
                <div class="flex flex-col gap-2">
                    <div class="font-title text-xl">Font Size</div>
                    <div class="text-background-300 text-lg leading-tight">Adjust the font size of all UI elements troughout
                        the app.</div>
                </div>
                <div class="flex items-center justify-between gap-5">
                    <span class="text-xs">Aa</span>
                    <input type="range" min="80" max="120" v-model="fontFactor" class="w-full accent-orange-600">
                    <span class="text-xl">Aa</span>
                </div>
            </div>
        </div>
    </div>
</template>