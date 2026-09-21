import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Config mínima para correr los scripts de `scripts/demo/` con
 * `vite-node` — lo único que necesitan es el alias `@/`, el mismo que
 * usa la aplicación. Aparte de `vitest.config.ts` a propósito: aquella
 * carga `setupFiles` y exclusiones que solo tienen sentido para los
 * tests, y un script no debería arrastrar eso.
 *
 * `vite-node` ya viene con vitest, así que esto no agrega ninguna
 * dependencia nueva al proyecto.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
