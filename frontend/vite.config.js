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
    react({
      include: '**/*.{jsx,tsx}',
    }),
  ],

  server: {
    // true = listen on 0.0.0.0 so other laptops on the LAN can open the dev UI
    host: true,
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently moving to 5174 (breaks HMR)
    strictPort: true,
    open: false,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
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
