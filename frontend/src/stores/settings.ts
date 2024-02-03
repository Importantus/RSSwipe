import axios from 'axios';
import configuredAxios from '@/axios';
import { defineStore } from "pinia";

export interface AppSettings {
    fontFactor: number;
    backendUrl?: string;
}

const defaultSettings: AppSettings = {
    fontFactor: 100,
};

function loadSettings(): AppSettings {
    const settings = localStorage.getItem('appSettings');
    return {
        ...defaultSettings,
        ...JSON.parse(settings || '{}'),
    }
}

export const useSettingsStore = defineStore({
    id: 'settings',
    state: () => ({
        settings: loadSettings(),
    }),

    actions: {
        getBackendUrl(): string | undefined {
            if (this.getRawBackendUrl()) {
                return prepareBackendUrl(this.getRawBackendUrl()!);
            }
            return undefined;
        },
        getRawBackendUrl(): string | undefined {
            console.log("Using cached backend url");
            return this.settings.backendUrl;
        },
        async fetchBackendUrl(): Promise<string> {
            console.log("Fetching backend url");
            const loadedUrl = await axios.create({ baseURL: "/" }).get("/backend_url").then((response) => response.data);
            this.settings.backendUrl = loadedUrl;
            this.updateSettings();
            console.log("Fetched backend url: ", loadedUrl);
            return loadedUrl;
        },
        setBackendUrl(url: string) {
            const changed = this.settings.backendUrl !== url;
            if (changed) {
                this.settings.backendUrl = url;
                this.updateSettings();
                configuredAxios.defaults.baseURL = prepareBackendUrl(url);
            }
        },
        applySettings() {
            this.applyFontFactor();
        },
        updateSettings() {
            localStorage.setItem('appSettings', JSON.stringify(this.settings));
        },
        // Font factor
        applyFontFactor() {
            document.documentElement.style.fontSize = `${this.settings.fontFactor}%`;
        },
        updateFontFactor(factor: number) {
            this.settings.fontFactor = factor;
            this.applyFontFactor();
            this.updateSettings();
        }
    }
});

export function prepareBackendUrl(url: string) {
    url = url ? url : "";
    let newUrl = url.trim();
    if (url.endsWith('/')) {
        newUrl = url.slice(0, -1)
    }
    return newUrl + '/v1';
}


