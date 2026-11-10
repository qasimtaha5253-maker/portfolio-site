import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Dev server only: `POST /__stills` with `{ name, data }` (a PNG data URL)
 * writes public/models/stills/<name>.webp. Used by the cover-still capture
 * tool (tools/stills.html); not part of the built site.
 */
function stillsWriter(): Plugin {
  return {
    name: 'portfolio:stills-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__stills', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const { name, data } = JSON.parse(body) as { name: string; data: string };
            if (!/^[\w-]+$/.test(name)) throw new Error(`bad still name: ${name}`);
            const png = Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64');
            const { default: sharp } = await import('sharp');
            const dir = path.resolve(import.meta.dirname, 'public/models/stills');
            await fs.mkdir(dir, { recursive: true });
            const out = path.join(dir, `${name}.webp`);
            await sharp(png).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(out);
            const { size } = await fs.stat(out);
            res.end(`${Math.round(size / 1024)} KB`);
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stillsWriter()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
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
