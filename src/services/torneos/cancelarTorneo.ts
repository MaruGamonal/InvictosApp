import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheTorneo } from '@/lib/cache';
import { notificarCambioDeTorneo } from './_notificarCambio';

/**
 * UC-21 — Cancelar un torneo, de forma definitiva (`cancelled` es
 * terminal). Precondición: el torneo está publicado o en curso —
 * `registration_open`, `registration_closed`, `in_progress` o
 * `suspended` (`02`, UC-21). No se borra: sigue consultable, y sus
 * partidos ya jugados siguieron ocurriendo de verdad.
 *
 * Motivo de la lista cerrada de `04`, 4.16 más `other` con texto libre
 * (`06`, D-66). Notifica a los equipos inscriptos y a quienes siguen el
 * torneo (`tournament_cancelled`, accionable).
 */

const ESTADOS_CANCELABLES = [
  'registration_open',
  'registration_closed',
  'in_progress',
  'suspended',
];

const esquemaEntrada = z
  .object({
    torneoId: z.string().uuid(),
    motivo: z.enum([
      'insufficient_teams',
      'venue_unavailable',
      'weather',
      'organizer_decision',
      'other',
    ]),
    motivoDetalle: z.string().trim().min(1).optional(),
  })
  .refine((d) => d.motivo !== 'other' || Boolean(d.motivoDetalle), {
    message: 'Con motivo "other" hace falta el texto libre.',
    path: ['motivoDetalle'],
  });
export type CancelarTorneoInput = z.infer<typeof esquemaEntrada>;

export const cancelarTorneo: Servicio<CancelarTorneoInput, { estado: 'cancelled' }> = async (
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
  if (!ESTADOS_CANCELABLES.includes(torneo.estado)) throw crearError('TRANSICION_NO_PERMITIDA');

  await pool.query(
    `UPDATE torneo
     SET estado = 'cancelled', motivo_cancelacion = $1, motivo_cancelacion_detalle = $2, version = version + 1
     WHERE id = $3`,
    [datos.motivo, datos.motivoDetalle ?? null, datos.torneoId],
  );

  await notificarCambioDeTorneo(datos.torneoId, 'tournament_cancelled', contexto);
  invalidarCacheTorneo(datos.torneoId);

  return { estado: 'cancelled' };
};
