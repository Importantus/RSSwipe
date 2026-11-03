<script setup lang="ts">
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import SwipeDirectionItem from '@/components/lists/settings/SwipeDirectionButton.vue';
import ArticleOrderButton from '@/components/lists/settings/ArticleOrderButton.vue';
import SettingsSection from '@/components/global/SettingsSection.vue';
import SettingsRow from '@/components/global/SettingsRow.vue';
import SwitchToggle from '@/components/global/SwitchToggle.vue';
import NumberStepper from '@/components/global/NumberStepper.vue';
import AppButton from '@/components/global/AppButton.vue';
import { useSnackbarStore } from '@/stores/snackbar';
import { useReadingListStore, StoreStatus, possibleSwipeDirections } from '@/stores/readingList';
import { useStarredListStore } from '@/stores/starredList';
import { ArrowLeftToLineIcon } from 'lucide-vue-next';
import { computed } from 'vue';

const store = useReadingListStore();
const starredStore = useStarredListStore();
const snackbar = useSnackbarStore();

const DEFAULT_EXPIRY_HOURS = 24;

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

const expTimeReadEnabled = computed({
    get: () => store.settings.expTimeRead >= 0,
    set: (value) => {
        store.settings.expTimeRead = value ? DEFAULT_EXPIRY_HOURS * 1000 * 60 * 60 : -1;
    },
});

const expTimeUnreadEnabled = computed({
    get: () => store.settings.expTimeUnread >= 0,
    set: (value) => {
        store.settings.expTimeUnread = value ? DEFAULT_EXPIRY_HOURS * 1000 * 60 * 60 : -1;
    },
});

function setSwipeDirection(id: string, isRightSwipe: boolean) {
    if (isRightSwipe) {
        store.setSwipeRight(id);
        starredStore.setSwipeRight(id);
    } else {
        store.setSwipeLeft(id);
        starredStore.setSwipeLeft(id);
    }
}

async function updateSettings() {
    store.settingsStatus = StoreStatus.READY;
    await store.updateSettings(store.settings);
    snackbar.show((store.settingsStatus as StoreStatus) === StoreStatus.SUCCESS ? 'Settings saved' : 'Error saving settings');
}

store.loadSettings();
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="List Settings" backNavigationPath="/readinglist" />
        <div class="flex flex-col gap-8">
            <SettingsSection v-if="store.settings.expTimeRead !== undefined" title="Automatic removal"
                footer="Articles are removed from your reading list after the chosen time.">
                <SettingsRow title="Remove read articles">
                    <SwitchToggle v-model="expTimeReadEnabled" title="Remove read articles automatically" />
                </SettingsRow>
                <SettingsRow v-if="expTimeReadEnabled" title="After">
                    <NumberStepper v-model="expTimeRead" :min="0" :max="999" unit="h" label="Hours until read articles are removed" />
                </SettingsRow>
                <SettingsRow title="Remove unread articles">
                    <SwitchToggle v-model="expTimeUnreadEnabled" title="Remove unread articles automatically" />
                </SettingsRow>
                <SettingsRow v-if="expTimeUnreadEnabled" title="After">
                    <NumberStepper v-model="expTimeUnread" :min="0" :max="999" unit="h" label="Hours until unread articles are removed" />
                </SettingsRow>
                <div class="p-4">
                    <AppButton @click="updateSettings">Save</AppButton>
                </div>
            </SettingsSection>

            <SettingsSection title="Swipe gestures"
                footer="The action performed when you swipe an article in your lists.">
                <div class="p-4 flex flex-col gap-5">
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-sm text-background-300">
                            <ArrowLeftToLineIcon :size="18" class="transform rotate-180" />
                            Swipe right
                        </div>
                        <div class="flex gap-2">
                            <SwipeDirectionItem v-for="direction in possibleSwipeDirections" :key="direction.id"
                                :ownDirection="direction" :selected="direction.id === store.swipeRight.id"
                                :onClick="() => setSwipeDirection(direction.id, true)" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-sm text-background-300">
                            <ArrowLeftToLineIcon :size="18" />
                            Swipe left
                        </div>
                        <div class="flex gap-2">
                            <SwipeDirectionItem v-for="direction in possibleSwipeDirections" :key="direction.id"
                                :ownDirection="direction" :selected="direction.id === store.swipeLeft.id"
                                :onClick="() => setSwipeDirection(direction.id, false)" />
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Article order" footer="Which article opens next when you finish one in the reader.">
                <div class="p-4 flex gap-2">
                    <ArticleOrderButton :is-only-unread="true" />
                    <ArticleOrderButton :is-only-unread="false" />
                </div>
            </SettingsSection>
        </div>
    </div>
</template>
