import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      {
        find: '@declarations',
        replacement: fileURLToPath(new URL('../declarations/', import.meta.url)),
      },
      {
        find: '@components',
        replacement: fileURLToPath(new URL('./src/components/', import.meta.url)),
      },
      {
        find: '@common',
        replacement: fileURLToPath(new URL('./src/common/', import.meta.url)),
      },
      {
        find: '@pages',
        replacement: fileURLToPath(new URL('./src/pages/', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
});
