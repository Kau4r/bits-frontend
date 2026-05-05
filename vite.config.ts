import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Vitest scans **/*.{test,spec}.ts by default — exclude the Playwright
    // e2e suite so it doesn't try to run those with the wrong runner.
    exclude: ['node_modules', 'dist', 'e2e/**', 'playwright-report/**', 'test-results/**'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
} as UserConfig & {
  test: {
    globals: boolean;
    environment: string;
    setupFiles: string[];
    exclude: string[];
    css: boolean;
    coverage: {
      provider: string;
      reporter: string[];
    };
  };
});
