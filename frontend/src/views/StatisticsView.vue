<script lang="ts" setup>
import { computed } from 'vue';
import { useStatisticsStore, type RecentDay } from '@/stores/statistics';
import { StoreStatus } from '@/stores/readingList';
import TitleNavigationBar from '@/components/global/TitleNavigationBar.vue';
import NonBlockingLoadingIndicator from '@/components/global/loadingIndicators/NonBlockingLoadIndicator.vue';
import BlockingLoadIndicator from '@/components/global/loadingIndicators/BlockingLoadIndicator.vue';
import ChartBar from '@/components/statistics/StatisticsChartBar.vue';
import ChartWrapper from '@/components/statistics/StatisticsChartWrapper.vue';

const store = useStatisticsStore();

const maxValSwiped = computed(() => {
    return Math.max(...store.recent.days.map((day: RecentDay) => day.seen));
});

const maxValRead = computed(() => {
    return Math.max(...store.recent.days.map((day: RecentDay) => day.read));
});

const recentDays = computed(() => {
    const days = store.recent.days;
    return days.reverse()
});

const feedsWithMostRead = computed(() => {
    const feeds = store.recent.feeds;
    return feeds.sort((a, b) => b.read - a.read).slice(0, 5);
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
                    <div class="text-xl font-semibold">Recent Usage</div>
                    <div class="text-sm text-background-300">{{ 'since ' + new
                        Date(store.recent.dateSince).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'numeric',
                            day: 'numeric'
                        }) }}</div>
                </div>
            </div>
            <div class="w-full flex justify-evenly gap-4 flex-wrap">
                <div class="flex flex-col items-center justify-center">
                    <div class="font-title text-xl">
                        {{ store.recent.totalSeen }}
                    </div>
                    <div>
                        Swiped
                    </div>
                </div>
                <div class="flex flex-col items-center justify-center">
                    <div class="font-title text-xl">
                        {{ store.recent.totalSaved }}
                    </div>
                    <div>
                        Saved
                    </div>
                </div>
                <div class="flex flex-col items-center justify-center">
                    <div class="font-title text-xl">
                        {{ store.recent.totalRead }}
                    </div>
                    <div>
                        Read
                    </div>
                </div>
                <div class="flex flex-col items-center justify-center">
                    <div class="font-title text-xl">
                        {{ store.recent.totalStarred }}
                    </div>
                    <div>
                        Starred
                    </div>
                </div>
            </div>
            <ChartWrapper title="Swiped Articles" value1="Swiped" value2="Saved" class="h-60">
                <ChartBar v-for="day in recentDays" :key="day.date" :date="new Date(day.date)" :maxVal="maxValSwiped"
                    :val="day.seen" :val2="day.saved" />
            </ChartWrapper>
            <ChartWrapper title="Read Articles" value1="Read" value2="Starred" class="h-60">
                <ChartBar v-for="day in recentDays" :key="day.date" :date="new Date(day.date)" :maxVal="maxValRead"
                    :val="day.read" :val2="day.starred" />
            </ChartWrapper>
            <ChartWrapper title="Read Feeds">
                <div class="flex flex-col gap-2 w-full">
                    <div v-for="feed in feedsWithMostRead" :key="feed.id" class="flex justify-between w-full gap-4">
                        <div class="text-background-300 truncate block">{{ feed.title }}</div>
                        <div class="text-background-300">{{ feed.read }}</div>
                    </div>
                </div>
            </ChartWrapper>
        </div>
    </div>
</template>
