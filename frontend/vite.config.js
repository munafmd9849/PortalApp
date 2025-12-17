import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      'react-pdf': 'react-pdf/dist/esm/entry.webpack5',
    },
  },
  optimizeDeps: {
    include: ['react-pdf'],
    force: true, // Force re-optimization
  },
  build: {
    target: 'es2020',
  },
  server: {
    hmr: {
      overlay: false, // Disable error overlay to prevent blocking
    },
  },
});
