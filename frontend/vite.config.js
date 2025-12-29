import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: 'localhost', // Use localhost instead of 0.0.0.0 to fix HMR WebSocket issues
    port: 5173,
    strictPort: false, // If 5173 is taken, Vite will use next available port
    open: false,
    // HMR configuration - explicitly set to avoid WebSocket connection issues
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    watch: {
      usePolling: false,
    },
  },
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
