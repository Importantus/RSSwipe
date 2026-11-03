<script setup lang="ts">
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import SettingsSection from '@/components/global/SettingsSection.vue';
import SettingsRow from '@/components/global/SettingsRow.vue';
import SwitchToggle from '@/components/global/SwitchToggle.vue';
import NumberStepper from '@/components/global/NumberStepper.vue';
import AppButton from '@/components/global/AppButton.vue';
import FeedAvatar from '@/components/feeds/FeedAvatar.vue';
import { useSettingsStore } from '@/stores/settings';
import { useHomeStore } from '@/stores/home';
import { useArticlesStore } from '@/stores/articles';
import { useUserdataStore } from '@/stores/userdata';
import { BarChart3, LogOut } from 'lucide-vue-next';
import { computed } from 'vue';
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const userStore = useUserdataStore();
const settingsStore = useSettingsStore();
const startPageStore = useHomeStore();
const articlesStore = useArticlesStore();
const authStore = useAuthStore()

const fontFactor = computed({
    get: () => settingsStore.settings.fontFactor,
    set: (value) => {
        settingsStore.updateFontFactor(value);
    }
});

const swipeLimitActive = computed({
    get: () => startPageStore.swipeLimit.active,
    set: (value) => {
        if (value) {
            startPageStore.enableSwipeLimit();
        } else {
            startPageStore.disableSwipeLimit();
        }
    }
});

const swipeLimit = computed({
    get: () => startPageStore.swipeLimit.swipeLimit,
    set: (value: number) => {
        startPageStore.setSwipeLimit(value);
        startPageStore.resetOverSwipes();
    }
});

// Day offsets relative to today (0 = today, 30 = 30 days ago)
const daysFrom = computed({
    get: () => Math.abs(Number(startPageStore.dateFrame.start)),
    set: (value: number) => startPageStore.setStartDay(-value)
});

const daysTo = computed({
    get: () => Math.abs(Number(startPageStore.dateFrame.end)),
    set: (value: number) => startPageStore.setEndDay(-value)
});

const maxDays = computed(() => Math.abs(startPageStore.dateFrame.maxStart));

const presets = computed(() => {
    const list = [
        { label: 'Today', days: 0 },
        { label: '3 days', days: 3 },
        { label: '1 week', days: 7 },
        { label: '2 weeks', days: 14 },
    ].filter((p) => p.days < maxDays.value);
    if (maxDays.value > 0) list.push({ label: 'All', days: maxDays.value });
    return list;
});

function applyPreset(days: number) {
    startPageStore.setEndDay(0);
    startPageStore.setStartDay(-days);
}

function presetActive(days: number) {
    return daysFrom.value === days && daysTo.value === 0;
}

const endDatetoDate = computed(() => {
    const date = startPageStore.getEndDate()
    date.setDate(date.getDate() - 1);
    return date;
});

function handleLogout() {
    authStore.logout()
    router.push('/')
}

startPageStore.fetchMaxStartDate()
userStore.fetchUserData();
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10">
        <TitleNavigationBar title="Settings" backNavigationPath="/" />
        <div class="flex flex-col gap-8">
            <SettingsSection>
                <SettingsRow to="/settings/account" :title="userStore.userdata.name || 'Account'"
                    :description="userStore.userdata.email" class="!py-4">
                    <template v-if="userStore.userdata.name">
                        <FeedAvatar :title="userStore.userdata.name" :size="48" rounded="rounded-full" class="order-first" />
                    </template>
                </SettingsRow>
                <SettingsRow to="/settings/statistics" title="Statistics" :icon="BarChart3" />
            </SettingsSection>

            <SettingsSection title="Time frame" footer="Only articles from this period are shown on the home screen.">
                <div class="px-4 py-4 flex flex-col gap-3">
                    <div class="flex items-baseline justify-between gap-3">
                        <div>Show articles from</div>
                        <div class="text-sm font-text-detail text-background-300 tabular-nums">
                            {{ startPageStore.getStartDate().toLocaleDateString() }} – {{ endDatetoDate.toLocaleDateString() }}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button v-for="preset in presets" :key="preset.label" type="button"
                            :aria-pressed="presetActive(preset.days)"
                            class="flex-1 rounded-xl px-1 py-2 text-xs whitespace-nowrap font-text-detail transition active:scale-95"
                            :class="presetActive(preset.days) ? 'bg-primary-600 text-white' : 'bg-white/10 text-background-200'"
                            @click="applyPreset(preset.days)">
                            {{ preset.label }}
                        </button>
                    </div>
                </div>
                <SettingsRow title="From" description="Oldest day, in days ago">
                    <NumberStepper v-model="daysFrom" :min="daysTo" :max="maxDays" unit="d" label="Days ago: oldest article" />
                </SettingsRow>
                <SettingsRow title="Until" description="Newest day, 0 = today">
                    <NumberStepper v-model="daysTo" :min="0" :max="daysFrom" unit="d" label="Days ago: newest article" />
                </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Swiping">
                <SettingsRow title="Daily swipe limit" description="Stop yourself from swiping too much">
                    <SwitchToggle v-model="swipeLimitActive" title="Daily swipe limit" />
                </SettingsRow>
                <Transition name="fade">
                    <SettingsRow v-if="swipeLimitActive" title="Swipes per day">
                        <NumberStepper v-model="swipeLimit" :min="1" :max="999" label="Swipes per day" />
                    </SettingsRow>
                </Transition>
            </SettingsSection>

            <SettingsSection title="Data">
                <SettingsRow title="Preload article content" description="Articles open instantly. Turn off to save data.">
                    <SwitchToggle :model-value="articlesStore.prefetchEnabled"
                        @update:model-value="articlesStore.setPrefetchEnabled($event)" title="Preload article content" />
                </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Appearance">
                <div class="px-4 py-4 flex flex-col gap-3">
                    <div class="flex items-baseline justify-between gap-3">
                        <div>Text size</div>
                        <div class="text-sm font-text-detail text-background-300 tabular-nums">{{ fontFactor }}%</div>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                        <span class="text-xs">Aa</span>
                        <input type="range" min="80" max="120" v-model="fontFactor" aria-label="Text size"
                            class="w-full accent-primary-600">
                        <span class="text-xl">Aa</span>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection>
                <SettingsRow button danger title="Sign out" :icon="LogOut" @click="handleLogout" />
            </SettingsSection>
        </div>
    </div>
</template>
