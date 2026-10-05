#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { urlDePrueba } from './basePruebas.mjs';

/**
 * Corre Playwright con el entorno que la aplicación necesita para
 * servirse contra la base de punta a punta. Las variables tienen que
 * llegarle al servidor que levanta el `webServer` de Playwright, y la
 * forma de que lleguen es exportarlas acá.
 */
const urlDev = process.env.DATABASE_URL;
if (!urlDev) {
  throw new Error('DATABASE_URL no está configurada. Correr con "npm run test:e2e".');
}

const resultado = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: urlDePrueba(urlDev, '_e2e'),
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9/supabase-inexistente',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-de-mentira',
    NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${process.env.PUERTO_E2E ?? 3100}`,
  },
});
process.exit(resultado.status ?? 1);
