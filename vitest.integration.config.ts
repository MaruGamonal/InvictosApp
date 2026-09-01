import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * T27 — Suite de integración: corre contra Postgres real (la base
 * efímera que `scripts/preparar-base-pruebas.mjs` recrea y migra antes
 * de cada corrida), nunca contra un mock de `@/db/cliente`. Separada de
 * `vitest.config.ts` (los tests unitarios) porque necesita su propio
 * `setupFiles` para apuntar `DATABASE_URL` a esa base.
 *
 * `fileParallelism: false`: varios archivos de esta suite comparten la
 * misma base real (no una por test, como en los unitarios mockeados) —
 * correrlos en paralelo pisaría datos entre sí.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integracion/**/*.integration.test.ts'],
    setupFiles: ['./vitest.integration.setup.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
