import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.PUBLIC_PATH || '/',
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
  build: { outDir: 'build' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
