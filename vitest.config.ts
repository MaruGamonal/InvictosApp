import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Los tests de integración (T27) tienen su propia suite —
    // `vitest.integration.config.ts`, corrida por
    // `npm run test:integracion`— porque necesitan la base de pruebas
    // real que esa suite prepara antes de arrancar; acá excluidos para
    // que `npm test` (mockeado, sin Postgres) nunca los toque.
    exclude: ['node_modules/**', 'test/integracion/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
