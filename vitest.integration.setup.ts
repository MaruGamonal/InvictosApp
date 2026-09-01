/**
 * Antes de que cualquier test de integración importe `@/db/cliente`,
 * `DATABASE_URL` tiene que apuntar a la base de pruebas efímera que
 * `scripts/preparar-base-pruebas.mjs` ya recreó y migró — nunca a la de
 * desarrollo. Misma derivación que `scripts/basePruebas.mjs`, duplicada
 * a propósito: ese módulo es JavaScript plano (`allowJs: false` en este
 * proyecto no lo deja importarse desde un `.ts` tipado), y esta es la
 * única otra entrada que necesita el mismo cálculo.
 */
const urlDev = process.env.DATABASE_URL;
if (!urlDev) {
  throw new Error(
    'DATABASE_URL no está configurada. Correr con "npm run test:integracion", que la trae de .env.',
  );
}
const url = new URL(urlDev);
const nombreBase = url.pathname.replace(/^\//, '');
url.pathname = `/${nombreBase}_test`;
process.env.DATABASE_URL = url.toString();
