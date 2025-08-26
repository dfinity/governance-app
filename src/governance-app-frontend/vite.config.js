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
        replacement: fileURLToPath(new URL('./src/common/components/', import.meta.url)),
      },
      {
        find: '@constants',
        replacement: fileURLToPath(new URL('./src/common/constants/', import.meta.url)),
      },
      {
        find: '@contexts',
        replacement: fileURLToPath(new URL('./src/common/contexts/', import.meta.url)),
      },
      {
        find: '@hooks',
        replacement: fileURLToPath(new URL('./src/common/hooks/', import.meta.url)),
      },
      {
        find: '@queries',
        replacement: fileURLToPath(new URL('./src/common/queries/', import.meta.url)),
      },
      {
        find: '@types',
        replacement: fileURLToPath(new URL('./src/common/types/', import.meta.url)),
      },
      {
        find: '@utils',
        replacement: fileURLToPath(new URL('./src/common/utils/', import.meta.url)),
      },
      {
        find: '@common',
        replacement: fileURLToPath(new URL('./src/common/', import.meta.url)),
      },

      {
        find: '@routes',
        replacement: fileURLToPath(new URL('./src/routes/', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Run before each test file
    setupFiles: ['vitest.setup.ts'],
  },
});
