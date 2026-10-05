import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EscenarioSembrado } from './_sembrar';

/**
 * Lee los ids del escenario que sembró `npm run pretest:e2e`. Si el
 * archivo no está, el mensaje dice qué correr: un `ENOENT` crudo
 * mandaría a buscar el problema al lugar equivocado.
 */
export function leerEscenario(): EscenarioSembrado {
  const ruta = join(process.cwd(), 'test/e2e/.escenario.json');
  try {
    return JSON.parse(readFileSync(ruta, 'utf8')) as EscenarioSembrado;
  } catch {
    throw new Error(
      `No está el escenario sembrado (${ruta}). Correr "npm run pretest:e2e" antes de "npm run test:e2e".`,
    );
  }
}
