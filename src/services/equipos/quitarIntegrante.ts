import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo, verificarPuedeDejarEquipo } from '@/lib/permisos';

/**
 * UC-13 — Quitar a alguien del plantel permanente, o darse de baja uno
 * mismo. Escribe `left` en **todos** los vínculos activos de esa persona
 * en ese equipo — quitar del plantel es dejar de integrarlo, no perder
 * un rol puntual (eso es `cambiarRolIntegrante`) — y nunca borra nada.
 *
 * Autodarse de baja es del Jugador o DT sobre sí mismo (`06`, D-87):
 * inmediato y sin intervención del capitán. Quitar a **otra** persona es
 * exclusivo del Capitán (`10`, 4.3) — el Delegado no reconfigura el
 * plantel de otro.
 *
 * Dos validaciones, ninguna es una confirmación: el Capitán no puede
 * irse sin designar reemplazo (`CAPITAN_SIN_REEMPLAZO`), y quien está
 * habilitado en un torneo **en curso** (`torneo.estado = 'in_progress'`)
 * sigue habilitado ahí hasta que termine (`06`, D-18b) — la baja se
 * aplica igual, y esto solo se devuelve como advertencia.
 */

const esquemaEntrada = z.object({
  equipoId: z.string().uuid(),
  perfilId: z.string().uuid(),
});
export type QuitarIntegranteInput = z.infer<typeof esquemaEntrada>;

export interface QuitarIntegranteResultado {
  advertenciaSigueHabilitadoEnTorneo: boolean;
}

export const quitarIntegrante: Servicio<QuitarIntegranteInput, QuitarIntegranteResultado> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilPropioId = perfilRows[0]?.id ?? null;

  const esBajaPropia = perfilPropioId !== null && perfilPropioId === datos.perfilId;
  if (!esBajaPropia) {
    await verificarPermisoEquipo(contexto, perfilPropioId, datos.equipoId, 'accion_de_capitan');
  }

  await verificarPuedeDejarEquipo(datos.equipoId, datos.perfilId);

  const { rowCount } = await pool.query(
    `UPDATE integrante_equipo SET estado_vinculo = 'left', fecha_baja = now()
     WHERE equipo_id = $1 AND perfil_id = $2 AND estado_vinculo = 'active'`,
    [datos.equipoId, datos.perfilId],
  );
  if (!rowCount) throw crearError('NO_ENCONTRADO');

  const { rows: habilitadoRows } = await pool.query(
    `SELECT 1 FROM integrante_habilitado ih
     JOIN torneo t ON t.id = ih.torneo_id
     WHERE ih.equipo_id = $1 AND ih.perfil_id = $2 AND ih.estado = 'eligible' AND t.estado = 'in_progress'`,
    [datos.equipoId, datos.perfilId],
  );

  return { advertenciaSigueHabilitadoEnTorneo: habilitadoRows.length > 0 };
};
