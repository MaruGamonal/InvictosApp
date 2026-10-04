import * as Sentry from '@sentry/nextjs';
import { obtenerPool } from '@/db/cliente';

/**
 * Límite de frecuencia (`10`, sección 9): para que crear cuentas y
 * organizaciones descartables no sea gratis ni cómodo (`06`, D-51). Se
 * usa en registro, ingreso, recuperación de contraseña, envío de correos
 * de confirmación y de verificación de organización, y en el
 * autocompletado de direcciones.
 *
 * **El conteo vive en la base, no en el proceso.** Antes era un `Map` de
 * la instancia, con la advertencia escrita de que eso sólo alcanza con
 * un proceso. Ya corre en más de uno: Vercel levanta funciones
 * serverless en paralelo y cada una arrancaba con el `Map` vacío, así
 * que el límite de 5 registros cada 15 minutos era en realidad 5 × la
 * cantidad de instancias vivas. Contra lo que D-51 quiere frenar —altas
 * en serie— eso no era una defensa.
 *
 * El conteo lo hace `registrar_intento_limitado` en Postgres, de un solo
 * viaje y con un lock por clave: la migración explica por qué no son
 * tres consultas sueltas.
 *
 * **Si la base no contesta, cae al conteo en memoria** en vez de fallar.
 * Las dos razones: un límite degradado a por-instancia sigue frenando al
 * que reintenta en bucle, y lo contrario —negar— convertiría un hipo de
 * la base en "no podés ingresar". El primer fallo se reporta a Sentry,
 * porque si no esto se degrada en silencio y nadie se entera de que el
 * límite dejó de ser compartido.
 */

/** Respaldo: el mismo `Map` de antes, ahora sólo para cuando la base no está. */
const intentosPorClave = new Map<string, number[]>();

export interface LimiteFrecuencia {
  /** Cuántos intentos se permiten dentro de la ventana. */
  maximoIntentos: number;
  /** Tamaño de la ventana, en milisegundos. */
  ventanaMs: number;
}

/**
 * Una sola vez por proceso: el fallo que importa es "dejó de ser
 * compartido", y eso se dice una vez. Repetirlo por cada intento
 * llenaría Sentry justo cuando la base está en problemas.
 */
let yaSeReportoLaCaida = false;

function reportarCaida(error: unknown): void {
  if (yaSeReportoLaCaida) return;
  yaSeReportoLaCaida = true;
  Sentry.captureMessage(
    `El límite de frecuencia no pudo consultar la base y cayó al conteo en memoria: ${
      error instanceof Error ? error.message : String(error)
    }`,
    'warning',
  );
}

/** El respaldo en memoria, con la misma ventana deslizante de siempre. */
function contarEnMemoria(clave: string, limite: LimiteFrecuencia, ahora: number): number {
  const historial = intentosPorClave.get(clave) ?? [];
  const desde = ahora - limite.ventanaMs;
  const vigentes = historial.filter((marca) => marca > desde);
  vigentes.push(ahora);
  intentosPorClave.set(clave, vigentes);
  return vigentes.length;
}

/**
 * Registra un intento para `clave` y devuelve si está permitido. Cuenta
 * el intento igual esté permitido o no: un intento rechazado también
 * cuenta, para que reintentar rápido no reinicie la ventana.
 */
export async function verificarLimite(
  clave: string,
  limite: LimiteFrecuencia,
  ahora = Date.now(),
): Promise<boolean> {
  let intentos: number;
  try {
    const { rows } = await obtenerPool().query<{ intentos: number }>(
      'SELECT registrar_intento_limitado($1, $2, to_timestamp($3 / 1000.0)) AS intentos',
      [clave, limite.ventanaMs, ahora],
    );
    const contados = rows[0]?.intentos;
    // Sin número no hay conteo: la función podría no existir todavía
    // —migración sin correr— y eso no puede pasar por "cero intentos".
    if (typeof contados !== 'number') throw new Error('la base no devolvió el conteo');
    intentos = contados;
  } catch (error) {
    reportarCaida(error);
    intentos = contarEnMemoria(clave, limite, ahora);
  }

  return intentos <= limite.maximoIntentos;
}

/** Solo para tests: limpia el respaldo en memoria entre casos. */
export function reiniciarLimitesDeFrecuencia(): void {
  intentosPorClave.clear();
  yaSeReportoLaCaida = false;
}
