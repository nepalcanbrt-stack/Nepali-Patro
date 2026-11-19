import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8')
) as { version?: string };

const APP_VERSION = pkg.version || '1.0.0';
const BUILD_NUMBER = process.env.GITHUB_RUN_NUMBER || '';
const BUILD_SHA = (process.env.GITHUB_SHA || '').slice(0, 7);
const BUILD_TIME = new Date().toISOString();
const BUILD_ID =
  BUILD_NUMBER && BUILD_SHA
    ? `${APP_VERSION}+${BUILD_NUMBER}.${BUILD_SHA}`
    : `${APP_VERSION}+${BUILD_TIME.replace(/[:.]/g, '-')}`;

function emitVersionJsonPlugin(): Plugin {
  return {
    name: 'nepal-patro-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            appName: 'Nepal Patro',
            version: APP_VERSION,
            buildId: BUILD_ID,
            buildNumber: BUILD_NUMBER || null,
            commitSha: BUILD_SHA || null,
            builtAt: BUILD_TIME,
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
      __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME),
    },
    plugins: [
      react(),
      tailwindcss(),
      emitVersionJsonPlugin(),
      VitePWA({
        injectRegister: false,
        registerType: 'prompt',
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'नेपाल पात्रो · Nepal Patro',
          short_name: 'Nepal Patro',
          description:
            'Private Bikram Sambat Nepali calendar, daily Panchang, Subha Saait, festival countdowns, Rashifal, and BS-AD date converter.',
          theme_color: '#4C1D95',
          background_color: '#FAF8FC',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three-vendor',
                test: /node_modules[\\/]three/,
              },
              {
                name: 'firebase-vendor',
                test: /node_modules[\\/](firebase|@firebase)/,
              },
              {
                name: 'motion-vendor',
                test: /node_modules[\\/](motion|framer-motion)/,
              },
            ],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
