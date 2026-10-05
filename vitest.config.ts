import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Las otras dos suites tienen su propio corredor y acá se excluyen,
    // para que `npm test` —mockeado, sin Postgres ni navegador— nunca
    // las toque: integración (T27) necesita la base real que
    // `npm run test:integracion` prepara, y las de punta a punta las
    // corre Playwright, no Vitest (sus `.spec.ts` ni siquiera
    // compilarían acá).
    exclude: ['node_modules/**', 'test/integracion/**', 'test/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
