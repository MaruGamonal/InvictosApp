import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';

/**
 * T26, `10` 6.1 — Confirma un resultado que está `loaded`. Es el único
 * camino para eso: la confirmación automática por vencimiento del plazo
 * (la tarea horaria de `confirmarResultadosVencidos.ts`) y la
 * confirmación manual del otro equipo (T29, todavía no construida) pasan
 * las dos por acá — "si hubiera dos caminos, se desincronizan" (`10`,
 * 6, y `09`, 6.1).
 *
 * Por ahora solo lo puede invocar el contexto de sistema: la tarea
 * programada es el único llamador hasta que T29 sume el suyo, con su
 * propia verificación de permiso (el capitán del equipo rival). Marcar
 * `confirmado_por_vencimiento` con `contexto.esSistema` en vez de un
 * valor fijo ya deja ese día resuelto sin tocar esta función.
 *
 * Revalida que no haya una disputa abierta (`06`, D-60: una disputa
 * congela el plazo) acá adentro, no solo en el filtro de la tarea que
 * llama a este servicio — porque este es el único lugar por el que va a
 * pasar también la confirmación manual de T29.
 */

const esquemaEntrada = z.object({ partidoId: z.string().uuid() });
export type ConfirmarResultadoInput = z.infer<typeof esquemaEntrada>;

export interface ResultadoConfirmado {
  estadoResultado: 'confirmed';
  confirmadoPorVencimiento: boolean;
}

export const confirmarResultado: Servicio<ConfirmarResultadoInput, ResultadoConfirmado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  if (!contexto.esSistema) throw crearError('SIN_PERMISO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    torneo_id: string;
    equipo_local_id: string;
    equipo_visitante_id: string;
    estado_resultado: string;
  }>(
    `SELECT torneo_id, equipo_local_id, equipo_visitante_id, estado_resultado
     FROM partido WHERE id = $1`,
    [datos.partidoId],
  );
  const partido = rows[0];
  if (!partido) throw crearError('NO_ENCONTRADO');
  if (partido.estado_resultado !== 'loaded') throw crearError('RESULTADO_NO_CONFIRMABLE');

  const { rows: disputas } = await pool.query(
    `SELECT 1 FROM disputa_resultado WHERE partido_id = $1 AND estado = 'open' LIMIT 1`,
    [datos.partidoId],
  );
  if (disputas.length > 0) throw crearError('RESULTADO_NO_CONFIRMABLE');

  await pool.query(
    `UPDATE partido
     SET estado_resultado = 'confirmed', fecha_confirmacion_resultado = now(),
         confirmado_por_vencimiento = $2
     WHERE id = $1`,
    [datos.partidoId, contexto.esSistema],
  );

  invalidarCacheTorneo(partido.torneo_id);
  invalidarCacheEquipo(partido.equipo_local_id);
  invalidarCacheEquipo(partido.equipo_visitante_id);

  return { estadoResultado: 'confirmed', confirmadoPorVencimiento: contexto.esSistema };
};
