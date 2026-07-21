import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, requests to /api are proxied to the backend container/service.
// In production the Nginx image (see frontend/nginx.conf) does the same job.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
