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
      background_color: '#0A0A0A',
      theme_color: '#0A0A0A',
      orientation: 'portrait',
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
          "src": "screenshots/screenshot01.png",
          "sizes": "1440x3040",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "The login of the Application"
        },
        {
          "src": "screenshots/screenshot02.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "Homepage of the Application"
        },
        {
          "src": "screenshots/screenshot03.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "The In-App Reader"
        },
        {
          "src": "screenshots/screenshot04.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "The users personal Readinglist"
        },
        {
          "src": "screenshots/screenshot05.png",
          "sizes": "360x800",
          "type": "image/png",
          "form_factor": "narrow",
          "label": "The Readinglist configuration"
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
