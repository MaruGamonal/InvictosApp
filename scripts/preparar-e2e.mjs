#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { urlDePrueba } from './basePruebas.mjs';

/**
 * T27 — Lo que hay que tener listo antes de la suite de punta a punta:
 * una base propia, migrada y sembrada, y la aplicación construida.
 *
 * Base propia (`_e2e`) y no la de integración: las dos se recrean desde
 * cero al empezar, así que compartirlas haría que una corrida le
 * borrara el escenario a la otra si llegaran a solaparse.
 *
 * Las variables de Supabase van en falso a propósito. Las superficies
 * que recorre esta suite son las públicas (D-04b), que se sirven sin
 * sesión: sin cookie de sesión el cliente de Supabase ni siquiera sale
 * a la red. Lo que no se puede hacer acá es iniciar sesión, y eso está
 * dicho en el README de la suite.
 */
const urlDev = process.env.DATABASE_URL;
if (!urlDev) {
  throw new Error('DATABASE_URL no está configurada. Correr con "npm run pretest:e2e".');
}

const urlE2E = urlDePrueba(urlDev, '_e2e');

function correr(comando, argumentos, variables = {}) {
  const resultado = spawnSync(comando, argumentos, {
    stdio: 'inherit',
    env: { ...process.env, ...variables },
  });
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}

console.log('[preparar-e2e] recreando y migrando la base…');
correr('node', ['scripts/preparar-base-pruebas.mjs', '--sufijo', '_e2e']);

console.log('[preparar-e2e] sembrando el escenario…');
correr('npx', ['vite-node', '--config', 'vite.scripts.config.ts', 'scripts/sembrar-e2e.ts'], {
  DATABASE_URL: urlE2E,
});

console.log('[preparar-e2e] construyendo la aplicación…');
correr('npm', ['run', 'build'], {
  DATABASE_URL: urlE2E,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9/supabase-inexistente',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-de-mentira',
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${process.env.PUERTO_E2E ?? 3100}`,
});

// `unstable_cache` guarda sus entradas en `.next/cache/fetch-cache`, y
// ese directorio **sobrevive al build y al reinicio del servidor**. Sin
// borrarlo, la corrida arranca sirviendo datos del sembrado anterior: el
// síntoma fue una prueba buscando una ciudad que la lista cacheada
// todavía no tenía. Se borra después del build, que es quien lo vuelve
// a tocar.
console.log('[preparar-e2e] limpiando la caché de datos de Next…');
rmSync('.next/cache/fetch-cache', { recursive: true, force: true });

console.log('[preparar-e2e] listo.');
