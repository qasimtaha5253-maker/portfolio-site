import { defineConfig } from 'vite';

export default defineConfig({
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
