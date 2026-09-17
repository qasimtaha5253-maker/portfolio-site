import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Listen on all network interfaces so a phone on the same Wi-Fi can connect.
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
