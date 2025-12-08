import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'react-pdf': 'react-pdf/dist/esm/entry.webpack5',
    },
  },
  optimizeDeps: {
    include: ['react-pdf'],
  },
  build: {
    target: 'es2020',
  },
});
