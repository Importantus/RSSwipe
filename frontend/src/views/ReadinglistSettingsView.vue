<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import { useReadingListStore } from '@/stores/readingList';
import { computed } from 'vue';

const store = useReadingListStore();

const expTimeUnread = computed({
    get: () => Math.floor(store.settings.expTimeUnread / 1000 / 60 / 60),
    set: (value) => {
        store.settings.expTimeUnread = Math.floor(value * 1000 * 60 * 60);
    },
});

const expTimeRead = computed({
    get: () => Math.floor(store.settings.expTimeRead / 1000 / 60 / 60),
    set: (value) => {
        store.settings.expTimeRead = Math.floor(value * 1000 * 60 * 60);
    },
});

const expTimeReadNever = computed({
    get: () => store.settings.expTimeRead < 0,
    set: (value) => {
        if (value) {
            store.settings.expTimeRead = -1;
        } else {
            store.settings.expTimeRead = 0;
        }
    },
});

const expTimeUnreadNever = computed({
    get: () => store.settings.expTimeUnread < 0,
    set: (value) => {
        if (value) {
            store.settings.expTimeUnread = -1;
        } else {
            store.settings.expTimeUnread = 0;
        }
    },
});

function updateSettings() {
    store.updateSettings(store.settings);
}

store.loadSettings()
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Reading List Settings" backNavigationPath="/readinglist" class="mb-5" />
        <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-2">
                <div class="font-title text-xl">Time to expire</div>
                <div class="text-background-300 text-lg leading-tight">The time after which articles are removed from the
                    readinglist
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <div
                    class="font-title flex justify-between h-16 p-3 px-5 items-center bg-background-900 bg-opacity-30 rounded-sm">
                    Read Articles
                    <div class="flex items-center gap-6 flex-wrap">
                        <Transition name="readinglistsettings">
                            <div v-if="!expTimeReadNever" class="flex gap-2 items-center">
                                <input v-model="expTimeRead" type="number"
                                    class="w-10 text-center border-b-2 rounded-none bg-transparent text-lg" />
                                <div>hours</div>
                            </div>
                        </Transition>
                        <Transition name="fade">
                            <div v-if="!expTimeReadNever" class="h-10 w-[2px] bg-background-600">
                            </div>
                        </Transition>
                        <div class="flex gap-3 items-center">
                            <label for="expTimeReadNever">Never</label>
                            <input class="h-5 w-5 bg-primary-300 accent-primary-600" type="checkbox" name="expTimeReadNever"
                                v-model="expTimeReadNever">
                        </div>
                    </div>

                </div>
                <div
                    class="font-title flex justify-between h-16 p-3 px-5 items-center bg-background-900 bg-opacity-30 rounded-sm">
                    Unread Articles
                    <div class="flex items-center gap-6 flex-wrap">
                        <Transition name="readinglistsettings">
                            <div v-if="!expTimeUnreadNever" class="flex gap-2 items-center">
                                <input v-model="expTimeUnread" type="number"
                                    class="w-10 text-center border-b-2 rounded-none bg-transparent text-lg" />
                                <div>hours</div>
                            </div>
                        </Transition>
                        <Transition name="fade">
                            <div v-if="!expTimeUnreadNever" class="h-10 w-[2px] bg-background-600">
                            </div>
                        </Transition>
                        <div class="flex gap-3 items-center">
                            <label for="expTimeReadNever">Never</label>
                            <input class="h-5 w-5 bg-primary-300 accent-primary-600" type="checkbox" name="expTimeReadNever"
                                v-model="expTimeUnreadNever">
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <button @click="updateSettings"
                    class="w-full h-14 bg-primary-600 rounded-lg hover:bg-primary-800 transition">Save</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    /* display: none; <- Crashes Chrome on hover */
    -webkit-appearance: none;
    margin: 0;
    /* <-- Apparently some margin are still there even though it's hidden */
}

input[type=number] {
    -moz-appearance: textfield;
    /* Firefox */
}
</style>