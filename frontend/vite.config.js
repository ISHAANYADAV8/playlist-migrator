import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // FIXED: Explicitly tell Vite to listen on the 127.0.0.1 loopback interface
    host: '127.0.0.1',
    proxy: {
      '/auth': 'http://127.0.0.1:3000',
      '/google': 'http://127.0.0.1:3000',
      '/api': 'http://127.0.0.1:3000',
    },
  },
});