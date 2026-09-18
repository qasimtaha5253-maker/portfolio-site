import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        // Throwaway layout preview; safe to drop once a direction is chosen.
        altBento: path.resolve(import.meta.dirname, 'alt-bento.html'),
      },
    },
  },
  server: {
    // Listen on all network interfaces so a phone on the same Wi-Fi can connect.
    host: true,
    port: 5173,
    watch: {
      // Source photos are only read by `npm run images`; watching them can crash
      // the dev server while large files are still being copied in.
      ignored: ['**/content/**'],
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});
