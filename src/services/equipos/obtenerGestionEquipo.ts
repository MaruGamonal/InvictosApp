import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * Pantalla de gestión del plantel (`/equipo/[id]/gestionar`): lo que
 * `obtenerEquipoPublico` no trae porque es de lectura pública —
 * invitaciones y solicitudes de ingreso pendientes, visibles solo para
 * quien puede gestionar el plantel (Capitán o Delegado, `10`, 4.3).
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ObtenerGestionEquipoInput = z.infer<typeof esquemaEntrada>;

export interface InvitacionPendiente {
  perfilId: string;
  nombreVisible: string;
  rol: 'player' | 'delegate' | 'coach';
}

export interface SolicitudPendiente {
  perfilId: string;
  nombreVisible: string;
}

export interface GestionEquipoResultado {
  invitacionesPendientes: InvitacionPendiente[];
  solicitudesPendientes: SolicitudPendiente[];
}

export const obtenerGestionEquipo: Servicio<
  ObtenerGestionEquipoInput,
  GestionEquipoResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilPropioId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilPropioId, datos.equipoId, 'gestionar_plantel');

  const { rows: invitaciones } = await pool.query<{
    perfil_id: string;
    nombre_visible: string;
    rol_equipo: 'player' | 'delegate' | 'coach';
  }>(
    `SELECT ie.perfil_id, pd.nombre_visible, ie.rol_equipo
     FROM integrante_equipo ie
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE ie.equipo_id = $1 AND ie.estado_vinculo = 'invited'
     ORDER BY pd.nombre_visible ASC`,
    [datos.equipoId],
  );

  const { rows: solicitudes } = await pool.query<{ perfil_id: string; nombre_visible: string }>(
    `SELECT ie.perfil_id, pd.nombre_visible
     FROM integrante_equipo ie
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE ie.equipo_id = $1 AND ie.rol_equipo = 'player' AND ie.estado_vinculo = 'requested'
     ORDER BY pd.nombre_visible ASC`,
    [datos.equipoId],
  );

  return {
    invitacionesPendientes: invitaciones.map((fila) => ({
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
      rol: fila.rol_equipo,
    })),
    solicitudesPendientes: solicitudes.map((fila) => ({
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
    })),
  };
};
