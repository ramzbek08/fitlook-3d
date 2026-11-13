import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180, open: false, host: true, allowedHosts: true },
  preview: { port: 5181, host: true, allowedHosts: true },
});
