import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheTorneo } from '@/lib/cache';
import { notificarCambioDeTorneo } from './_notificarCambio';

/**
 * UC-20 — Avanzar el estado de un torneo ya publicado (`10`, 4.4). No
 * cubre `draft → registration_open` (eso es `publicarTorneo`) ni
 * `→ cancelled` (eso es `cancelarTorneo`, que pide motivo).
 *
 * `suspended` es reversible desde y hacia `registration_open`,
 * `registration_closed` e `in_progress`: como no queda registrado a
 * cuál de los tres se suspendió, quien reanuda elige explícitamente el
 * destino.
 *
 * Dos de las cuatro reglas de transición viven acá (las otras dos son
 * de T12 y T13): no se pasa a `in_progress` sin fixture generado, y
 * `registration_open → registration_closed` también ocurre
 * automáticamente al alcanzar el cupo (T12), no solo por esta vía
 * manual.
 */

const TRANSICIONES_PERMITIDAS: Record<string, string[]> = {
  registration_open: ['registration_closed', 'suspended'],
  registration_closed: ['registration_open', 'in_progress', 'suspended'],
  in_progress: ['finished', 'suspended'],
  suspended: ['registration_open', 'registration_closed', 'in_progress'],
};

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  estadoDestino: z.enum([
    'registration_open',
    'registration_closed',
    'in_progress',
    'finished',
    'suspended',
  ]),
});
export type AvanzarEstadoInput = z.infer<typeof esquemaEntrada>;

export const avanzarEstado: Servicio<AvanzarEstadoInput, { estado: string }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ estado: string }>('SELECT estado FROM torneo WHERE id = $1', [
    datos.torneoId,
  ]);
  const torneo = rows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');

  const permitidos = TRANSICIONES_PERMITIDAS[torneo.estado] ?? [];
  if (!permitidos.includes(datos.estadoDestino)) throw crearError('TRANSICION_NO_PERMITIDA');

  if (datos.estadoDestino === 'in_progress') {
    const { rows: partidos } = await pool.query(
      'SELECT 1 FROM partido WHERE torneo_id = $1 LIMIT 1',
      [datos.torneoId],
    );
    if (partidos.length === 0) throw crearError('TRANSICION_NO_PERMITIDA');
  }

  await pool.query('UPDATE torneo SET estado = $1, version = version + 1 WHERE id = $2', [
    datos.estadoDestino,
    datos.torneoId,
  ]);

  if (datos.estadoDestino === 'in_progress') {
    await notificarCambioDeTorneo(datos.torneoId, 'tournament_started', contexto);
  } else if (datos.estadoDestino === 'finished') {
    await notificarCambioDeTorneo(datos.torneoId, 'tournament_finished', contexto);
  }

  invalidarCacheTorneo(datos.torneoId);

  return { estado: datos.estadoDestino };
};
