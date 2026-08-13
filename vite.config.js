import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const basePath = process.env.VITE_BASE_PATH || './'
const normalizedBasePath = basePath.startsWith('/') ? basePath.replace(/\/$/, '') : ''
const apiProxyPath = normalizedBasePath ? `${normalizedBasePath}/api` : '/api'
const publicHost = process.env.PUBLIC_HOST || 'macmini.tailbba978.ts.net'

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', '127.0.0.1', 'host.docker.internal', publicHost],
    proxy: {
      [apiProxyPath]: {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8320',
        changeOrigin: true,
        rewrite: normalizedBasePath
          ? (path) => path.replace(new RegExp(`^${normalizedBasePath}`), '')
          : undefined,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})
