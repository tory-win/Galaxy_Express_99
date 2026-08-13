import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const productApiTarget = process.env.PRODUCT_API_TARGET ?? 'http://127.0.0.1:8320';
const allowedHosts = ['localhost', '127.0.0.1', 'product-web'];
if (process.env.PUBLIC_HOST?.trim()) allowedHosts.push(process.env.PUBLIC_HOST.trim());

export default defineConfig({
  base: '/galaxy-express/preview/',
  cacheDir: '../../node_modules/.vite-gx99-product',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts,
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
    proxy: {
      '/galaxy-express/api': {
        target: productApiTarget,
        changeOrigin: true,
        xfwd: true,
        rewrite: (path) => path
          .replace(/^\/galaxy-express\/api\/product/, '')
          .replace(/^\/galaxy-express\/api/, ''),
      },
    },
  },
});
