/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Anno 1800 Blueprint Planner',
        short_name: 'Anno Planner',
        description: 'Offline-capable blueprint builder for Anno 1800 city planning.',
        theme_color: '#0a0a16',
        background_color: '#0a0a16',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json}'],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/__tests__/components/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      // exportImport.ts and share.ts use browser APIs (File System Access, clipboard)
      // and cannot be meaningfully unit-tested; exclude them from threshold enforcement.
      thresholds: {
        'src/lib/productionMath.ts': { lines: 100, branches: 100 },
      },
    },
  },
} as any)
