import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Bagikan ke Kula (K4a): share_target hanya ada di manifest bila flag tangkapTeks menyala saat build
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const tangkapTeks = env.VITE_FEATURE_TANGKAP_TEKS === 'true';
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png'
        ],
        manifest: {
          id: '/',
          name: 'Kula – Tumbuh sekeluarga',
          short_name: 'Kula',
          lang: 'id',
          description: 'Kula membantu keluarga merawat yang bertumbuh: jadwal imunisasi, keuangan rumah tangga, dan catatan penting dalam satu tempat yang tenang.',
          theme_color: '#FFFFFF',
          background_color: '#E6F6FA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          ...(tangkapTeks
            ? {
                share_target: {
                  action: '/#/keuangan-keluarga/tempel',
                  method: 'GET',
                  params: { title: 'title', text: 'text', url: 'url' }
                }
              }
            : {}),
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Chunk three bersama (±910 kB) dan pemakainya (maskot 3D, ilustrasi gerakan) hanya diunduh saat dipakai.
          // Jangan diunduh paksa oleh setiap HP yang memasang PWA; di-cache saat dipakai (runtime caching di bawah).
          globIgnores: ['**/three-*.js', '**/KulaMascot-*.js', '**/AnimasiTumbuh3D-*.js'],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/(three|KulaMascot|AnimasiTumbuh3D)-[^/]+\.js$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'maskot-3d-cache',
                expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: false,
          type: 'module'
        }
      })
    ],
    build: {
      rolldownOptions: {
        output: {
          // Satu chunk three bernama tetap, dipakai bersama maskot dan ilustrasi gerakan (dan bisa dikecualikan dari precache).
          advancedChunks: {
            // Jangan ikut menarik dependensi bersama (react, helper CJS) ke chunk three: index tidak boleh mengimpornya.
            includeDependenciesRecursively: false,
            groups: [{ name: 'three', test: /node_modules[\\/](three|@react-three)[\\/]/ }]
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve('.')
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {}
    }
  };
});
