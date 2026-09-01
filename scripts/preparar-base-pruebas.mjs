#!/usr/bin/env node
import pg from 'pg';
import { spawnSync } from 'node:child_process';
import { urlDePrueba, urlAdmin, nombreDeBase } from './basePruebas.mjs';

/**
 * T27 — "Dado una máquina limpia, cuando se corre el comando de tests,
 * entonces se levanta la base, se aplican las migraciones y la batería
 * completa corre sin configuración manual." Este script es ese primer
 * paso: recrea la base de pruebas efímera desde cero y le aplica todas
 * las migraciones — nunca reutiliza una base con datos de una corrida
 * anterior, porque los tests de integración necesitan partir de un
 * estado conocido.
 */
async function main() {
  const urlDev = process.env.DATABASE_URL;
  if (!urlDev) {
    throw new Error(
      'DATABASE_URL no está configurada. Correr con "dotenv -e .env -q --" adelante (así lo hace "npm run pretest:integracion").',
    );
  }

  const urlPrueba = urlDePrueba(urlDev);
  const nombrePrueba = nombreDeBase(urlPrueba);

  const admin = new pg.Client({ connectionString: urlAdmin(urlDev) });
  await admin.connect();
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [nombrePrueba],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${nombrePrueba}"`);
    await admin.query(`CREATE DATABASE "${nombrePrueba}"`);
  } finally {
    await admin.end();
  }
  console.log(`[preparar-base-pruebas] "${nombrePrueba}" recreada. Aplicando migraciones...`);

  const resultado = spawnSync(
    'npx',
    ['node-pg-migrate', 'up', '--migrations-dir', 'db/migrations'],
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL: urlPrueba } },
  );
  if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1);
  }

  console.log('[preparar-base-pruebas] migraciones aplicadas.');
}

main().catch((error) => {
  console.error('[preparar-base-pruebas]', error);
  process.exit(1);
});
