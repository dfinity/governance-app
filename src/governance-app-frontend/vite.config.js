import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';

dotenv.config({ path: '../../.env', quiet: true });

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') // React 19 dependency
            )
              return 'vendor-core-react';

            if (id.includes('@tanstack')) return 'vendor-tanstack';

            // Isolate the ICP SDKs as they are heavy
            if (
              id.includes('@dfinity') ||
              id.includes('@icp-sdk') ||
              id.includes('@noble') ||
              id.includes('ic-use-internet-identity')
            )
              return 'vendor-icp';

            if (id.includes('markdown') || id.includes('remark') || id.includes('micromark'))
              return 'vendor-md';

            if (id.includes('recharts') || id.includes('d3') || id.includes('lodash'))
              return 'vendor-recharts';

            // Everything else (Lucide, Radix, Motion)
            return 'vendor-libs';
          }
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  plugins: [
    visualizer({ open: true }),
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
    environment('all', { prefix: 'EXTRA_' }),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      {
        find: '@declarations',
        replacement: fileURLToPath(new URL('../declarations/', import.meta.url)),
      },
      {
        find: '@contexts',
        replacement: fileURLToPath(new URL('./src/app/contexts/', import.meta.url)),
      },
      {
        find: '@features',
        replacement: fileURLToPath(new URL('./src/features/', import.meta.url)),
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
        find: '@hooks',
        replacement: fileURLToPath(new URL('./src/common/hooks/', import.meta.url)),
      },
      {
        find: '@typings',
        replacement: fileURLToPath(new URL('./src/common/typings/', import.meta.url)),
      },
      {
        find: '@utils',
        replacement: fileURLToPath(new URL('./src/common/utils/', import.meta.url)),
      },
      {
        find: '@fixtures',
        replacement: fileURLToPath(new URL('./tests/fixtures/', import.meta.url)),
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
    globals: true,
    environment: 'jsdom',
    exclude: ['./node_modules', './dist', './tests/e2e/**'],
    // Run before each test file
    setupFiles: ['vitest.setup.ts'],
  },
});
