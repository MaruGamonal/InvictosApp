import { Pool } from 'pg';
import * as Sentry from '@sentry/nextjs';

/**
 * Conexión a PostgreSQL (Supabase) por variable de entorno (`10`, 2.1).
 * Un único pool por proceso; nunca se crea uno por invocación de servicio.
 */
let pool: Pool | undefined;

/**
 * Cómo se está conectando la aplicación, deducido de la URL.
 *
 * No es un detalle de infraestructura: **cambia cuántas conexiones se
 * pueden abrir**, y por lo tanto cuántas puede abrir cada instancia sin
 * tumbar a las demás.
 *
 * - `sesion`: el pooler de Supabase en modo sesión (puerto 5432). Cada
 *   conexión se queda con un lugar del pooler **mientras viva**, aunque
 *   no esté haciendo nada. El cupo es chico (15 en el plan gratuito) y
 *   se reparte entre todas las instancias vivas a la vez.
 * - `transaccion`: el mismo pooler en modo transacción (puerto 6543).
 *   El lugar se ocupa **solo mientras dura una consulta**, así que el
 *   mismo cupo alcanza para muchísimas más instancias. Es el modo
 *   pensado para funciones sin servidor.
 * - `directa`: sin pooler. Sirve para migraciones y para desarrollo.
 */
type ModoDeConexion = 'sesion' | 'transaccion' | 'directa';

const PUERTO_MODO_TRANSACCION = '6543';

export function detectarModoDeConexion(connectionString: string): ModoDeConexion {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return 'directa';
  }
  if (!url.hostname.includes('pooler.supabase.com')) return 'directa';
  return url.port === PUERTO_MODO_TRANSACCION ? 'transaccion' : 'sesion';
}

/**
 * Tope de conexiones **por instancia**, no del proyecto entero.
 *
 * Sin `max`, `pg` usa 10. En Vercel cada función corre en su propia
 * instancia y cada una levanta su propio pool, así que el total contra
 * Supabase es `max` × instancias vivas.
 *
 * Por eso el número sale del modo de conexión y no es uno fijo. En modo
 * sesión el cupo del pooler es 15 y cada conexión se queda con un lugar
 * mientras viva: con 5 por instancia alcanza con tres instancias
 * simultáneas para agotarlo, y la cuarta persona que entra recibe un
 * error en vez de una página. Reportado en vivo, exactamente así:
 * `EMAXCONNSESSION: max clients reached in session mode`.
 *
 * Bajarlo a 2 no arregla el modo sesión —solo corre el límite de tres
 * instancias a siete—, pero hace que el techo se note mucho más tarde
 * mientras la URL se cambia a modo transacción, que es el arreglo de
 * verdad.
 */
const CONEXIONES_MAXIMAS: Record<ModoDeConexion, number> = {
  sesion: 2,
  transaccion: 5,
  directa: 5,
};

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

    const modo = detectarModoDeConexion(connectionString);

    /**
     * El modo sesión sobre el pooler es una configuración equivocada
     * para este hosting, no una preferencia. Se avisa una vez, al
     * crear el pool, porque el síntoma —páginas que fallan de a
     * ratos, cuando hay varias personas a la vez— no se parece en nada
     * a su causa, y perseguirlo desde el error cuesta horas.
     *
     * Nunca se manda la URL: lleva la contraseña adentro.
     */
    if (modo === 'sesion') {
      Sentry.captureMessage(
        'DATABASE_URL apunta al pooler en modo sesión: cambiar al puerto 6543 (modo transacción)',
        { level: 'warning', tags: { origen: 'pool-postgres' } },
      );
    }

    pool = new Pool({
      connectionString,
      max: CONEXIONES_MAXIMAS[modo],
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
