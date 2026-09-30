import type { Pool } from 'pg';
import { enviarCorreo, hayProveedorDeCorreo } from '@/lib/correo';
import { construirCorreoDeNotificacion } from './_contenidoDelCorreo';
import type { TipoNotificacion } from './tipos';

/**
 * El despacho de un puñado de filas de `notificacion` con canal
 * `email`. Lo usan los dos caminos del híbrido:
 *
 * 1. `notificar()`, apenas registra el aviso — para que el correo salga
 *    en el momento y no dentro de diez minutos.
 * 2. `despacharCorreosPendientes()`, la tarea agendada, que recoge lo
 *    que en el paso 1 falló (proveedor caído, red, variable de entorno
 *    sin cargar todavía).
 *
 * Es el mismo código en los dos, a propósito: si el correo inmediato y
 * el reintentado se armaran por separado, el segundo sería el que nadie
 * mira y el que se rompe sin que se note.
 *
 * **Nunca lanza.** Un correo que no sale no puede voltear la operación
 * de negocio que lo generó, ni cortar el lote de la tarea.
 */

/** Después de esto, la fila se deja quieta: lo que falla cinco veces no mejora a la sexta. */
export const MAXIMO_INTENTOS = 5;

export interface FilaParaDespachar {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  entidadOrigenTipo: string | null;
  entidadOrigenId: string | null;
}

export interface ResumenDeDespacho {
  enviados: number;
  fallidos: number;
  /** Filas que ni se intentaron: sin proveedor configurado, o sin casilla confirmada. */
  omitidos: number;
}

function urlDelSitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Nombre de la entidad de origen, para el asunto. Una consulta por
 * tabla y no una por fila: un lote de 200 avisos del mismo torneo no
 * puede ser 200 consultas.
 *
 * `partido` no tiene nombre y queda afuera a propósito — ese correo se
 * manda igual, sin la segunda línea.
 */
async function resolverNombres(
  pool: Pool,
  filas: FilaParaDespachar[],
): Promise<Map<string, string>> {
  const nombres = new Map<string, string>();
  const porTabla: Record<'equipo' | 'torneo', string[]> = { equipo: [], torneo: [] };

  for (const fila of filas) {
    if (!fila.entidadOrigenId) continue;
    if (fila.entidadOrigenTipo === 'equipo') porTabla.equipo.push(fila.entidadOrigenId);
    if (fila.entidadOrigenTipo === 'torneo') porTabla.torneo.push(fila.entidadOrigenId);
  }

  for (const tabla of ['equipo', 'torneo'] as const) {
    const ids = [...new Set(porTabla[tabla])];
    if (ids.length === 0) continue;
    const { rows } = await pool.query<{ id: string; nombre: string }>(
      // El nombre de la tabla sale de una lista literal de este archivo,
      // nunca de la entrada: no hay interpolación de datos acá.
      `SELECT id, nombre FROM ${tabla} WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    for (const fila of rows) nombres.set(`${tabla}:${fila.id}`, fila.nombre);
  }

  return nombres;
}

/**
 * Casillas a las que se puede escribir: sólo las confirmadas (`06`,
 * D-90 / confirmación de cuenta). Mandarle a una casilla que nadie
 * verificó es la forma más rápida de que el dominio termine en spam.
 */
async function resolverCasillas(pool: Pool, usuarioIds: string[]): Promise<Map<string, string>> {
  const { rows } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM usuario WHERE id = ANY($1::uuid[]) AND email_confirmado = true`,
    [[...new Set(usuarioIds)]],
  );
  return new Map(rows.map((fila) => [fila.id, fila.email]));
}

async function marcarEnviada(pool: Pool, notificacionId: string): Promise<void> {
  await pool.query(
    `UPDATE notificacion
     SET estado = 'delivered', fecha_envio = now(), intentos = intentos + 1, ultimo_error = NULL
     WHERE id = $1`,
    [notificacionId],
  );
}

async function marcarFallida(pool: Pool, notificacionId: string, error: unknown): Promise<void> {
  const mensaje = error instanceof Error ? error.message : 'ERROR_DESCONOCIDO';
  await pool.query(
    `UPDATE notificacion
     SET estado = 'failed', intentos = intentos + 1, ultimo_error = $2
     WHERE id = $1`,
    [notificacionId, mensaje.slice(0, 500)],
  );
}

/**
 * Manda las filas que se le pasan y deja cada una en su estado final.
 * Devuelve el resumen; no lanza.
 */
export async function despacharFilas(
  pool: Pool,
  filas: FilaParaDespachar[],
): Promise<ResumenDeDespacho> {
  const resumen: ResumenDeDespacho = { enviados: 0, fallidos: 0, omitidos: 0 };
  if (filas.length === 0) return resumen;

  // Sin proveedor no se toca nada: las filas quedan como estaban y la
  // tarea las vuelve a tomar cuando la variable esté cargada. Contarlas
  // como intento acá gastaría los cinco reintentos contra una
  // configuración que todavía no existe.
  if (!hayProveedorDeCorreo()) {
    resumen.omitidos = filas.length;
    return resumen;
  }

  const sitio = urlDelSitio();
  const [nombres, casillas] = await Promise.all([
    resolverNombres(pool, filas),
    resolverCasillas(
      pool,
      filas.map((fila) => fila.usuarioId),
    ),
  ]);

  for (const fila of filas) {
    const casilla = casillas.get(fila.usuarioId);
    if (!casilla) {
      resumen.omitidos += 1;
      continue;
    }

    const clave =
      fila.entidadOrigenTipo && fila.entidadOrigenId
        ? `${fila.entidadOrigenTipo}:${fila.entidadOrigenId}`
        : '';
    const correo = construirCorreoDeNotificacion(
      {
        tipo: fila.tipo,
        entidadOrigenTipo: fila.entidadOrigenTipo,
        entidadOrigenId: fila.entidadOrigenId,
        nombreEntidad: nombres.get(clave) ?? null,
      },
      sitio,
    );

    try {
      await enviarCorreo({ para: casilla, ...correo });
      await marcarEnviada(pool, fila.id);
      resumen.enviados += 1;
    } catch (error) {
      // Un rechazo definitivo (casilla inválida, remitente sin
      // verificar) y uno pasajero (proveedor caído) se marcan igual: la
      // diferencia la hace `MAXIMO_INTENTOS` en la consulta de la
      // tarea. Un `failed` con cinco intentos ya no se vuelve a tomar,
      // y `ultimo_error` guarda cuál de los dos fue.
      await marcarFallida(pool, fila.id, error).catch(() => {});
      resumen.fallidos += 1;
    }
  }

  return resumen;
}
