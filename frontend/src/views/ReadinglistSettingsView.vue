<script setup lang="ts">
import TitleNavigationBar from '@/components/TitleNavigationBar.vue';
import SwipeDirectionItem from '@/components/list/settings/SwipeDirectionItem.vue';
import { useReadingListStore, StoreStatus, possibleSwipeDirections } from '@/stores/readingList';
import { ArrowLeftToLineIcon } from 'lucide-vue-next';
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
        <TitleNavigationBar title="Reading List Settings" backNavigationPath="/readinglist" />
        <div class="mb-5">
            <div v-if="store.settingsStatus === StoreStatus.SUCCESS" class="w-full bg-green-500 rounded-lg p-3 z-10">
                Settings saved successfully
            </div>
            <div v-if="store.settingsStatus === StoreStatus.ERROR" class="w-full bg-red-500 rounded-lg p-3 z-10">
                Error saving settings
            </div>
        </div>

        <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-2">
                <div class="font-title text-xl">Time to expire</div>
                <div class="text-background-300 text-lg leading-tight">The time after which articles are removed from the
                    readinglist
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <div
                    class="font-title flex justify-between min-h-[4rem] gap-5 p-3 px-5 items-center bg-background-900 bg-opacity-30 rounded-sm">
                    Read Articles
                    <div class="flex items-center  justify-end gap-x-5 gap-y-3 flex-wrap-reverse ">
                        <Transition name="readinglistsettings">
                            <div v-if="!expTimeReadNever" class="flex gap-2 items-center">
                                <input v-model="expTimeRead" type="number"
                                    class="w-10 text-center border-b-2 rounded-none bg-transparent text-lg" />
                                <div>hours</div>
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
                    class="font-title flex justify-between min-h-[4rem]  gap-5 p-3 px-5 items-center bg-background-900 bg-opacity-30 rounded-sm">
                    Unread Articles
                    <div class="flex items-center justify-end gap-x-5 gap-y-3 flex-wrap-reverse">
                        <Transition name="readinglistsettings">
                            <div v-if="!expTimeUnreadNever" class="flex gap-2 items-center">
                                <input v-model="expTimeUnread" type="number"
                                    class="w-10 text-center border-b-2 rounded-none bg-transparent text-lg" />
                                <div>hours</div>
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

        <div class="mt-14 flex flex-col gap-10">
            <div class="flex flex-col gap-2">
                <div class="font-title text-xl">Swipe gestures</div>
                <div class="text-background-300 text-lg leading-tight">The actions that are performed when swiping an
                    article
                    to the left or right
                </div>
            </div>
            <div>
                <div class="flex font-title items-center gap-3 text-lg">
                    <ArrowLeftToLineIcon size="30" class="text-white transform rotate-180" />
                    Swipe right
                </div>
                <div class="mt-5 flex gap-3 h-fit">
                    <SwipeDirectionItem v-for="direction in possibleSwipeDirections" :key="direction.id"
                        :ownDirection="direction" :selected="direction.id === store.swipeRight.id"
                        :onClick="() => store.setSwipeRight(direction.id)" />
                </div>
            </div>
            <div>
                <div class="flex font-title items-center gap-3 text-lg">
                    <ArrowLeftToLineIcon size="30" class="text-white" />
                    Swipe left
                </div>
                <div class="mt-5 flex gap-3">
                    <SwipeDirectionItem v-for="direction in possibleSwipeDirections" :key="direction.id"
                        :ownDirection="direction" :selected="direction.id === store.swipeLeft.id"
                        :onClick="() => store.setSwipeLeft(direction.id)" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type=number] {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>