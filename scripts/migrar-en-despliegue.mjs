#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Aplica las migraciones durante el despliegue (`buildCommand` de
 * `vercel.json`), eligiendo por qué conexión hacerlo.
 *
 * **Por qué hace falta elegir.** La aplicación se conecta por el pooler
 * de Supabase en **modo transacción** (puerto 6543), que es el único
 * que aguanta muchas instancias sin servidor: el lugar en el pooler se
 * ocupa solo mientras dura una consulta.
 *
 * Las migraciones no pueden ir por ahí. `node-pg-migrate` se protege de
 * dos despliegues simultáneos con `pg_try_advisory_lock`, que es un lock
 * **de sesión**: vale mientras viva la conexión que lo tomó. En modo
 * transacción cada consulta puede caer en una conexión distinta del
 * servidor, así que el lock se toma en una y se intenta liberar en otra.
 * En el mejor caso no protege nada; en el peor queda tomado en una
 * conexión que nadie va a liberar, y **el despliegue siguiente se cuelga
 * esperándolo**.
 *
 * Por eso las migraciones van por `DATABASE_URL_MIGRACIONES`: el
 * pooler en **modo sesión** (puerto 5432), donde la sesión sí es una
 * sola y el lock vale. Corre una vez por despliegue, así que el cupo
 * chico del modo sesión no molesta.
 *
 * **No la conexión directa**, aunque también tenga sesión fija: en los
 * proyectos nuevos de Supabase resuelve solo por IPv6, y el entorno de
 * construcción de Vercel no lo habla. Falla al conectar, y el error no
 * nombra al IPv6 por ningún lado.
 *
 * Si la variable no está, usa `DATABASE_URL` — que es lo que pasaba
 * antes de que existiera esta separación, y sigue siendo correcto
 * mientras esa URL no sea la de modo transacción. En ese caso avisa,
 * porque el síntoma (un despliegue colgado, semanas después) no se
 * parece en nada a la causa.
 */

const PUERTO_MODO_TRANSACCION = '6543';

function esModoTransaccion(cadena) {
  try {
    const url = new URL(cadena);
    return url.hostname.includes('pooler.supabase.com') && url.port === PUERTO_MODO_TRANSACCION;
  } catch {
    return false;
  }
}

const urlMigraciones = process.env.DATABASE_URL_MIGRACIONES;
const urlAplicacion = process.env.DATABASE_URL;
const elegida = urlMigraciones ?? urlAplicacion;

if (!elegida) {
  console.error(
    'Falta DATABASE_URL (o DATABASE_URL_MIGRACIONES) para aplicar las migraciones.\n' +
      'Se cargan en Vercel → Settings → Environment Variables.',
  );
  process.exit(1);
}

if (!urlMigraciones && esModoTransaccion(elegida)) {
  console.error(
    'DATABASE_URL apunta al pooler en modo transacción (puerto 6543) y no hay\n' +
      'DATABASE_URL_MIGRACIONES. Las migraciones necesitan una sesión fija: usan un\n' +
      'advisory lock que, por el pooler, se tomaría en una conexión y se liberaría en\n' +
      'otra — puede quedar colgado y trabar los despliegues siguientes.\n\n' +
      'Cargá DATABASE_URL_MIGRACIONES con la cadena del pooler en modo sesión\n' +
      '(Supabase → Connect → "Session pooler", puerto 5432) y volvé a desplegar.\n' +
      'Ver docs/contexto/pasos-infraestructura-T28.md, paso 5.',
  );
  process.exit(1);
}

/**
 * El ejecutable se resuelve desde el paquete y se corre con el mismo
 * `node`, en vez de confiar en que esté en el PATH: eso solo es cierto
 * cuando lo llama npm, y este script también se corre a mano.
 */
const require = createRequire(import.meta.url);
const paqueteMigraciones = require.resolve('node-pg-migrate/package.json');
const ejecutable = path.join(path.dirname(paqueteMigraciones), 'bin', 'node-pg-migrate.js');

const resultado = spawnSync(
  process.execPath,
  [
    ejecutable,
    'up',
    '--migrations-dir',
    'db/migrations',
    '--database-url-var',
    'DATABASE_URL_ELEGIDA',
  ],
  { stdio: 'inherit', env: { ...process.env, DATABASE_URL_ELEGIDA: elegida } },
);

process.exit(resultado.status ?? 1);
