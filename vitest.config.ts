/// <reference types="vitest" />
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['./app/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['./app/**/*.e2e.{js,jsx,ts,tsx}', 'node_modules'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'test',
        '**/*.d.ts',
        '**/*.test.tsx?',
        '**/*.spec.tsx?',
      ],
    },
  },
});
