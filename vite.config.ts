import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repo at https://<user>.github.io/kids-study-app/, not the
  // domain root, so every asset URL needs this prefix — import.meta.env.BASE_URL already
  // threads it through everywhere in the app that builds an image/audio path.
  base: '/kids-study-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.png'],
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
