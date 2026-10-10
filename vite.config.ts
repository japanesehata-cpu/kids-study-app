import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// GitHub Pages serves this repo at https://<user>.github.io/kids-study-app/, not the
// domain root, so every asset URL needs this prefix — import.meta.env.BASE_URL already
// threads it through everywhere in the app that builds an image/audio path.
const BASE = '/kids-study-app/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.png', 'fonts/*.woff2'],
      workbox: {
        // Pictures and recorded speech (~850MB in all) are far too big to download up front,
        // so each file is kept on the phone the first time it is used — enough for "once
        // played, works offline" (docs/functional-design.md F-15). The app's own JS/CSS/HTML
        // and the font are precached as usual.
        runtimeCaching: [
          {
            // A RegExp, not a function: the pattern is written into sw.js as-is, so it can't
            // refer to BASE at run time.
            urlPattern: new RegExp(`^https?://[^/]+${BASE}images/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 4000, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: new RegExp(`^https?://[^/]+${BASE}audio/`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio',
              cacheableResponse: { statuses: [200] },
              // <audio> elements ask for byte ranges; this answers them from the cached file.
              rangeRequests: true,
              expiration: { maxEntries: 8000, purgeOnQuotaError: true },
            },
          },
        ],
      },
      manifest: {
        name: 'まなびフレンズ / Manabi Friends',
        short_name: 'まなびフレンズ',
        description: '算数・英語・ことば・考える力を、キャラクターと遊びながら養う子ども向け学習アプリ',
        theme_color: '#ff8fc7',
        background_color: '#ffe9f4',
        display: 'standalone',
        // Portrait only — the app is built for a parent's phone held upright (docs/architecture.md).
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
