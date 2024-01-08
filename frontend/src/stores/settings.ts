import { defineStore } from "pinia";

export interface AppSettings {
    fontFactor: number;
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
    },
});