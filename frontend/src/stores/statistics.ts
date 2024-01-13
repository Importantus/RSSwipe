import { defineStore } from "pinia";
import { StoreStatus } from "./readingList";
import axios from "@/axios";

export interface RecentDay {
    date: string;
    seen: number;
    read: number;
    starred: number;
    saved: number;
}

export interface RecentFeed {
    id: string;
    title: string;
    faviconUrl: string;
    read: number;
}

interface RecentStatistics {
    dateSince: string;
    totalSeen: number;
    totalRead: number;
    totalStarred: number;
    totalSaved: number;
    days: Array<RecentDay>;
    feeds: Array<RecentFeed>;
}

export const useStatisticsStore = defineStore({
    id: "statistics",
    state: () => ({
        status: StoreStatus.LOADING,
        recent: {} as RecentStatistics
    }),
    actions: {
        async fetchRecent() {
            this.status = StoreStatus.LOADING;
            try {
                const response = await axios.get("/statistics/recent");
                this.recent = response.data as RecentStatistics;
            } catch (e) {
                this.status = StoreStatus.ERROR;
            }
            this.status = StoreStatus.READY;
        }
    }
})