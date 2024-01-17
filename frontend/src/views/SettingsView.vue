<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { useSettingsStore } from '@/stores/settings';
import { useStartPageStore } from '@/stores/startPage';
import { useUserdataStore } from '@/stores/userdata';
import { MoveRight } from 'lucide-vue-next';
import { computed } from 'vue';


const userStore = useUserdataStore();
const settingsStore = useSettingsStore();
const startPageStore = useStartPageStore();

const fontFactor = computed({
    get: () => settingsStore.settings.fontFactor,
    set: (value) => {
        settingsStore.updateFontFactor(value);
    }
});

const swipeLimitInactive = computed({
    get: () => !startPageStore.swipeLimit.active,
    set: (value) => {
        if (!value) {
            startPageStore.enableSwipeLimit();
        } else {
            startPageStore.disableSwipeLimit();
        }
    }
});

const swipeLimit = computed({
    get: () => startPageStore.swipeLimit.swipeLimit,
    set: (value) => {
        startPageStore.setSwipeLimit(value);
    }
});

function onInput(event: Event) {
    let target = event.target as HTMLInputElement;
    let value = JSON.parse(JSON.stringify(target.value.replace(/[^0-9]/g, '')))

    // If the input is empty, add a 0
    if (value.length === 0) {
        value = '0';
    }

    // If the value has trailing zeros, remove them
    if (value.length > 1 && value[0] === '0') {
        value = value.slice(1);
    }

    // If the value has more than 3 digits, remove the last one
    if (value.length > 4) {
        value = value.slice(0, 4);
    }

    target.value = value;

    // Set the value again after the input has been updated because Firefox doesn't update the value immediately
    setTimeout(() => {
        target.value = value;
    }, 0)
}

userStore.fetchUserData();
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Settings" backNavigationPath="/" />
        <div class="flex flex-col gap-10">
            <div class="flex flex-col gap-3">
                <div class="flex py-5 px-5 justify-between items-center bg-background-900 bg-opacity-20 rounded-md">
                    <div class="flex flex-col gap-1">
                        <h2 class="font-title text-2xl">{{ userStore.userdata.name }}</h2>
                        <p class="font-title font-light text-background-300">{{ userStore.userdata.email }}</p>
                    </div>
                    <router-link to="/settings/account"
                        class="bg-background-900 py-2 px-4 rounded-md opacity-70 hover:shadow-lg flex gap-2 items-center"
                        title="Account Editing">
                        Edit
                        <MoveRight :size="16" class="mt-[1px]" />
                    </router-link>
                </div>
                <div class="flex py-5 px-5 justify-between items-center bg-background-900 bg-opacity-20 rounded-md">
                    <div class="flex flex-col gap-1">
                        <h2 class="text-lg">Statistics</h2>
                    </div>
                    <router-link to="/settings/statistics"
                        class="bg-background-900 py-2 px-4 rounded-md opacity-70 hover:shadow-lg flex gap-2 items-center"
                        title="Statistics">
                        <MoveRight :size="16" class="mt-[1px]" />
                    </router-link>
                </div>
            </div>
            <div class="flex flex-col gap-5" title="change the Font Size">
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
            <div class="flex flex-col gap-5" title="Set a swipe limit">
                <div class="flex flex-col gap-2">
                    <div class="font-title text-xl">Daily Swipe Limit</div>
                    <div class="text-background-300 text-lg leading-tight">
                        Set a daily swipe limit to prevent yourself from swiping too much.
                    </div>
                </div>
                <div class="flex items-center justify-between gap-5">
                    <div class="flex flex-col items-center w-full justify-end gap-x-5 gap-y-3 flex-wrap-reverse ">
                        <div class="flex gap-3 items-center w-full justify-between bg-background-900/20 p-4 rounded">
                            <label for="expTimeReadNever">Let me swipe endlessly</label>
                            <input class="h-5 w-5 bg-primary-300 accent-primary-600" type="checkbox" name="expTimeReadNever"
                                v-model="swipeLimitInactive">
                        </div>
                        <div :class="{
                            'opacity-50': swipeLimitInactive,
                            'pointer-events-none': swipeLimitInactive
                        }"
                            class="flex gap-3 items-center w-full justify-between bg-background-900/20 p-4 rounded transition">
                            <label for="NumberSwipes">What's your limit?</label>
                            <div>
                                <input @input="onInput" name="NumberSwipes" v-model="swipeLimit" type="number" max="999"
                                    min="0" class="w-16 text-center border-b-2 rounded-none bg-transparent text-lg" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>