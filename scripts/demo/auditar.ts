import { obtenerPool } from '@/db/cliente';
import { obtenerAmbiente } from '@/lib/ambiente';
import { DOMINIO_DEMO } from './_identidad';
import { describirBase } from './_guarda';

/**
 * ¿Hay datos demo en esta base?
 *
 * Está pensado para correrlo **contra producción**, que es donde la
 * respuesta tiene que ser cero. Por eso es el único script de esta
 * carpeta sin la guarda de ambiente: negarse a correr en producción
 * sería negarse a hacer justo aquello para lo que existe.
 *
 * Y por eso también **no escribe nada**: sólo `SELECT`. El día que haya
 * que correrlo es un día en el que nadie quiere que un script toque
 * producción; que sea de sólo lectura es lo que hace que se pueda
 * correr sin pensarlo dos veces.
 *
 * Termina con código 1 si encuentra algo, así que sirve igual a mano
 * que en un paso automático antes de abrir el sitio.
 *
 * Correrlo:
 *   npm run demo:auditar
 */

const EMAIL_DEMO = `%@${DOMINIO_DEMO}`;
/** El seed anterior usaba este dominio; se busca también para no dar por limpia una base que lo tenga. */
const EMAIL_DEMO_LEGACY = '%@demo.invicta.local';
const PREFIJO_DEMO = '%[DEMO]%';

interface Rastro {
  etiqueta: string;
  sql: string;
  params: unknown[];
}

const RASTROS: Rastro[] = [
  {
    etiqueta: 'cuentas con dominio demo',
    sql: `SELECT count(*)::int AS cuantos FROM usuario WHERE email ILIKE $1 OR email ILIKE $2`,
    params: [EMAIL_DEMO, EMAIL_DEMO_LEGACY],
  },
  {
    etiqueta: 'organizaciones [DEMO]',
    sql: `SELECT count(*)::int AS cuantos FROM organizacion WHERE nombre ILIKE $1`,
    params: [PREFIJO_DEMO],
  },
  {
    etiqueta: 'torneos [DEMO]',
    sql: `SELECT count(*)::int AS cuantos FROM torneo WHERE nombre ILIKE $1`,
    params: [PREFIJO_DEMO],
  },
  {
    etiqueta: 'equipos [DEMO]',
    sql: `SELECT count(*)::int AS cuantos FROM equipo WHERE nombre ILIKE $1`,
    params: [PREFIJO_DEMO],
  },
  {
    etiqueta: 'certámenes [DEMO]',
    sql: `SELECT count(*)::int AS cuantos FROM certamen WHERE nombre ILIKE $1`,
    params: [PREFIJO_DEMO],
  },
  {
    etiqueta: 'perfiles de cuentas demo',
    sql: `SELECT count(*)::int AS cuantos FROM perfil_deportivo p
          JOIN usuario u ON u.id = p.usuario_id
          WHERE u.email ILIKE $1 OR u.email ILIKE $2`,
    params: [EMAIL_DEMO, EMAIL_DEMO_LEGACY],
  },
];

export async function auditarDemo(): Promise<number> {
  const pool = obtenerPool();

  console.log('Auditoría de datos demo');
  console.log(`  ambiente: ${obtenerAmbiente()}`);
  console.log(`  base:     ${describirBase()}\n`);

  let total = 0;
  for (const rastro of RASTROS) {
    const { rows } = await pool.query<{ cuantos: number }>(rastro.sql, rastro.params);
    const cuantos = rows[0]?.cuantos ?? 0;
    total += cuantos;
    console.log(`  ${cuantos === 0 ? 'limpio' : 'HAY   '} ${rastro.etiqueta}: ${cuantos}`);
  }

  // Para que "limpio" no pueda querer decir "la base está vacía": una
  // base recién creada daría cero en todo y pasaría igual. Esto dice
  // contra qué se comparó.
  const { rows: reales } = await pool.query<{ torneos: number; usuarios: number }>(
    `SELECT
       (SELECT count(*)::int FROM torneo WHERE nombre NOT ILIKE $1) AS torneos,
       (SELECT count(*)::int FROM usuario WHERE email NOT ILIKE $2 AND email NOT ILIKE $3) AS usuarios`,
    [PREFIJO_DEMO, EMAIL_DEMO, EMAIL_DEMO_LEGACY],
  );
  console.log(
    `\n  (no demo en esta base: ${reales[0]?.torneos ?? 0} torneos, ${reales[0]?.usuarios ?? 0} cuentas)`,
  );

  if (total === 0) {
    console.log('\nSin rastros de datos demo.');
  } else {
    console.log(`\nHay ${total} fila(s) de datos demo en esta base.`);
    console.log('Si esto es producción, se limpian con "npm run demo:limpiar -- --confirmar"');
    console.log('en un entorno que apunte a esta base y con NEXT_PUBLIC_AMBIENTE=pruebas.');
  }
  return total;
}

if (process.argv.includes('--ejecutar')) {
  auditarDemo()
    .then(async (total) => {
      await obtenerPool().end();
      process.exit(total === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
