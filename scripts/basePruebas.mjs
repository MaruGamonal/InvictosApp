/**
 * T27 — Deriva la URL de la base de pruebas efímera a partir de
 * `DATABASE_URL` (la de desarrollo), agregando el sufijo `_test` al
 * nombre de la base. Es la única fuente de verdad de esa derivación:
 * `preparar-base-pruebas.mjs` la usa para crear y migrar la base, y
 * `vitest.integration.setup.ts` la vuelve a calcular para apuntar el
 * pool de cada test ahí — nunca a la base de desarrollo. Así, correr
 * los tests de integración no pide ninguna variable de entorno nueva:
 * alcanza con el `DATABASE_URL` que ya existe.
 *
 * El sufijo es parámetro porque la suite de punta a punta usa su propia
 * base (`_e2e`): comparte el mecanismo pero no los datos, así que una
 * corrida no le pisa el escenario a la otra.
 */
export function urlDePrueba(urlDesarrollo, sufijo = '_test') {
  const url = new URL(urlDesarrollo);
  const nombreBase = url.pathname.replace(/^\//, '');
  url.pathname = `/${nombreBase}${sufijo}`;
  return url.toString();
}

/** Conexión "administrativa": a la base `postgres`, que siempre existe, para poder crear/borrar la de pruebas. */
export function urlAdmin(urlDesarrollo) {
  const url = new URL(urlDesarrollo);
  url.pathname = '/postgres';
  return url.toString();
}

export function nombreDeBase(url) {
  return new URL(url).pathname.replace(/^\//, '');
}
