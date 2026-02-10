import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  
  server: {
    host: 'localhost', 
    port: 5173,
    strictPort: false, 
    open: false,
    // HMR configuration - explicitly set to avoid WebSocket connection issues
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: false, // Disable error overlay to prevent blocking
    },
    watch: {
      usePolling: false,
    },
  },
  resolve: {
    alias: {
      // Use absolute path for react-pdf to avoid duplicate module warnings
      'react-pdf': path.resolve(__dirname, 'node_modules/react-pdf/dist/esm/entry.webpack5'),
    },
  },
  optimizeDeps: {
    // Exclude react-pdf from optimizeDeps since we're using alias with absolute path
    exclude: ['react-pdf'],
  },
  build: {
    target: 'es2020',
  },
});
