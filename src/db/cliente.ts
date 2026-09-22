import { Pool } from 'pg';
import * as Sentry from '@sentry/nextjs';

/**
 * Conexión a PostgreSQL (Supabase) por variable de entorno (`10`, 2.1).
 * Un único pool por proceso; nunca se crea uno por invocación de servicio.
 */
let pool: Pool | undefined;

/**
 * Tope de conexiones **por instancia**, no del proyecto entero.
 *
 * Sin `max`, `pg` usa 10. En Vercel cada función corre en su propia
 * instancia y cada una levanta su propio pool, así que el total contra
 * Supabase es 10 × instancias vivas — y Supabase corta bastante antes
 * de eso en los planes chicos. Un número bajo acá no hace más lenta a
 * la aplicación: las páginas hacen unas pocas consultas cortas, y lo
 * que se gana es que una ráfaga espere unos milisegundos en vez de que
 * la base rechace la conexión.
 */
const CONEXIONES_MAXIMAS = 5;

/** Una conexión ociosa devuelta rápido es una que otra instancia puede usar. */
const MILISEGUNDOS_OCIOSA = 10_000;

/** Antes que colgar la petición: si no hay conexión en 5s, se falla y se ve. */
const MILISEGUNDOS_PARA_CONECTAR = 5_000;

export function obtenerPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está configurada');
    }

    pool = new Pool({
      connectionString,
      max: CONEXIONES_MAXIMAS,
      idleTimeoutMillis: MILISEGUNDOS_OCIOSA,
      connectionTimeoutMillis: MILISEGUNDOS_PARA_CONECTAR,
    });

    /**
     * **Esto no es opcional.** `pg` emite `'error'` en el pool cuando una
     * conexión **ociosa** se cae —y Supabase las corta sola cada tanto,
     * igual que cualquier corte de red—. Un `'error'` de un EventEmitter
     * sin ningún listener no se convierte en una promesa rechazada: Node
     * lo lanza como excepción no capturada y **se lleva puesto el
     * proceso entero**.
     *
     * Reportado en vivo como "después de guardar, el inicio y el perfil
     * fallan por unos minutos": no fallaba el guardado — se caía la
     * instancia, y todo lo que dependía de ella dejaba de responder
     * hasta que arrancaba otra. Los minutos son el arranque en frío.
     *
     * Con el listener, la conexión rota se descarta y el pool sigue
     * andando; la siguiente consulta abre una nueva. Va a Sentry porque
     * si esto pasa seguido hay algo que mirar del lado de la base.
     */
    pool.on('error', (error) => {
      Sentry.captureException(error, { tags: { origen: 'pool-postgres' } });
    });
  }
  return pool;
}
