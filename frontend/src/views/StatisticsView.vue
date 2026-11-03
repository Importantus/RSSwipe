<script lang="ts" setup>
import { computed } from 'vue';
import { useStatisticsStore, type RecentDay } from '@/stores/statistics';
import { StoreStatus } from '@/stores/readingList';
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import NonBlockingLoadingIndicator from '@/components/global/loadingIndicators/NonBlockingLoadIndicator.vue';
import BlockingLoadIndicator from '@/components/global/loadingIndicators/BlockingLoadIndicator.vue';
import ChartBar from '@/components/statistics/StatisticsChartBar.vue';
import SettingsSection from '@/components/global/SettingsSection.vue';
import SettingsRow from '@/components/global/SettingsRow.vue';
import FeedAvatar from '@/components/feeds/FeedAvatar.vue';
import ChartWrapper from '@/components/statistics/StatisticsChartWrapper.vue';

const store = useStatisticsStore();

const maxValSwiped = computed(() => {
    return Math.max(1, ...store.recent.days.map((day: RecentDay) => day.seen));
});

const maxValRead = computed(() => {
    return Math.max(1, ...store.recent.days.map((day: RecentDay) => day.read));
});

const recentDays = computed(() => {
    return [...store.recent.days].reverse()
});

const feedsWithMostRead = computed(() => {
    return [...store.recent.feeds].sort((a, b) => b.read - a.read).slice(0, 5);
});

const tiles = computed(() => [
    { label: 'Swiped', value: store.recent.totalSeen },
    { label: 'Saved', value: store.recent.totalSaved },
    { label: 'Read', value: store.recent.totalRead },
    { label: 'Starred', value: store.recent.totalStarred },
]);

const maxFeedRead = computed(() => Math.max(1, ...feedsWithMostRead.value.map((f) => f.read)));

function percent(part: number, whole: number) {
    return whole > 0 ? Math.round((part / whole) * 100) + '%' : '–';
}

const averagePerDay = computed(() => {
    const days = store.recent.days.length;
    return days > 0 ? Math.round(store.recent.totalSeen / days) : 0;
});

store.fetchRecent();
</script>

<template>
    <div class="px-5 overflow-y-scroll pb-10 h-full">
        <TitleNavigationBar title="Statistics" backNavigationPath="/settings">
        </TitleNavigationBar>
        <BlockingLoadIndicator v-if="store.status === StoreStatus.LOADING && !store.recent.dateSince" :show="true" />
        <div v-else class="flex flex-col gap-5">
            <NonBlockingLoadingIndicator :show="store.status === StoreStatus.LOADING" />
            <div>
                <div class="flex justify-between gap-4 flex-wrap items-center">
                    <h2 class="text-xl font-semibold font-title">Recent usage</h2>
                    <div class="text-sm font-text-detail text-background-300">{{ 'since ' + new
                        Date(store.recent.dateSince).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'numeric',
                            day: 'numeric'
                        }) }}</div>
                </div>
            </div>
            <div class="grid grid-cols-4 divide-x divide-white/5 bg-secondary-950 rounded-2xl py-3">
                <div v-for="tile in tiles" :key="tile.label" class="flex flex-col items-center gap-0.5 px-1">
                    <div class="font-title text-xl tabular-nums">{{ tile.value }}</div>
                    <div class="text-[10px] font-text-detail uppercase tracking-wider text-background-400">{{ tile.label }}</div>
                </div>
            </div>
            <SettingsSection>
                <SettingsRow title="Swipes per day" description="Average over this period">
                    <span class="font-text-detail font-semibold tabular-nums">{{ averagePerDay }}</span>
                </SettingsRow>
                <SettingsRow title="Save rate" description="Share of swiped articles you saved">
                    <span class="font-text-detail font-semibold tabular-nums">{{ percent(store.recent.totalSaved, store.recent.totalSeen) }}</span>
                </SettingsRow>
                <SettingsRow title="Read rate" description="Share of swiped articles you read">
                    <span class="font-text-detail font-semibold tabular-nums">{{ percent(store.recent.totalRead, store.recent.totalSeen) }}</span>
                </SettingsRow>
            </SettingsSection>
            <ChartWrapper title="Swiped Articles" value1="Swiped" value2="Saved" class="h-52">
                <ChartBar v-for="day in recentDays" :key="day.date" :date="new Date(day.date)" :maxVal="maxValSwiped"
                    :val="day.seen" :val2="day.saved" />
            </ChartWrapper>
            <ChartWrapper title="Read Articles" value1="Read" value2="Starred" class="h-52">
                <ChartBar v-for="day in recentDays" :key="day.date" :date="new Date(day.date)" :maxVal="maxValRead"
                    :val="day.read" :val2="day.starred" />
            </ChartWrapper>
            <ChartWrapper v-if="feedsWithMostRead.length" title="Most read feeds">
                <div class="flex flex-col gap-3 w-full">
                    <div v-for="feed in feedsWithMostRead" :key="feed.id" class="flex items-center gap-3 w-full">
                        <FeedAvatar :title="feed.title" :favicon-url="feed.faviconUrl" :size="28" rounded="rounded-md" />
                        <div class="flex-1 min-w-0 flex flex-col gap-1">
                            <div class="flex justify-between gap-3 text-sm">
                                <span class="truncate">{{ feed.title }}</span>
                                <span class="text-background-300 font-text-detail tabular-nums">{{ feed.read }}</span>
                            </div>
                            <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div class="h-full rounded-full bg-primary-600"
                                    :style="{ width: (feed.read / maxFeedRead) * 100 + '%' }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </ChartWrapper>
        </div>
    </div>
</template>
