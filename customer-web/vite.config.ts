import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
	base: '/portal/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
		id: '/portal/',
        name: 'RadBill Portal Pelanggan',
        short_name: 'RadBill',
        description: 'Portal pelanggan untuk melihat layanan, tagihan, dan profil.',
        lang: 'id-ID',
		start_url: '/portal/',
		scope: '/portal/',
        display: 'standalone',
        background_color: '#f5f7ff',
        theme_color: '#4775ed',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        rollupFormat: 'iife',
      },
    }),
  ],
  server: {
    port: 5173,
    // Tambahkan ini agar Cloudflare Tunnel Anda tidak diblokir oleh Vite
    allowedHosts: ['default.acs.my.id'],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
