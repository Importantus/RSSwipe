import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),
  VitePWA({

    includeAssets: ["favicon.ico", "icons/Logo.svg"],
    registerType: 'autoUpdate', devOptions: { enabled: true },
    manifest: {
      name: 'RSS Swiper',
      short_name: 'RSSS',
      description: "A card swpiping RSS reader",
      theme_color: '#0A0A0A',
      icons: [
        {
          src: 'icons/Logo-Small.png',
          sizes: '128x128',
          type: 'image/png',
        },
        {
          src: 'icons/Logo-Small@2x.png',
          sizes: '256x256',
          type: 'image/png',
        },
        {
          src: 'icons/Logo-Small@3x.png',
          sizes: '384x384',
          type: 'image/png',
        },
        {
          src: 'icons/Logo-Small@4x.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: 'icons/Logo-Small@0.5x.png',
          sizes: '64x64',
          type: 'image/png',
        },
      ],
      screenshots: [
        {
          "src": "screenshots/screenshot-01.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "Login Page of the Application"
        },
        {
          "src": "screenshots/screenshot-02.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "Main Page of the Application"
        },
        {
          "src": "screenshots/screenshot-03.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "The Users personal Reading List"
        },
        {
          "src": "screenshots/screenshot-04.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "The Users personal Feeds"
        },
      ]
    },
  }
  )],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
