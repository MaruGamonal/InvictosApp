import { sembrarEscenario, ARCHIVO_ESCENARIO } from '../test/e2e/_sembrar';

/** Entrada del sembrado: lo llama `scripts/preparar-e2e.mjs`. */
async function main() {
  const escenario = await sembrarEscenario();
  console.log(`[sembrar-e2e] escenario en ${ARCHIVO_ESCENARIO}`);
  console.log(
    `[sembrar-e2e] torneo "${escenario.torneoNombre}" con ${escenario.equipoIds.length} equipos`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('[sembrar-e2e]', error);
  process.exit(1);
});
