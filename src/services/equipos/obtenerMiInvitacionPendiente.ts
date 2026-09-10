import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-12 — La invitación al plantel de este equipo que estoy por
 * responder, si tengo una pendiente. Sin sesión, sin perfil, o sin
 * ningún vínculo `invited` en este equipo, `null` — no es un error, es
 * la respuesta correcta para alguien que entra sin tener nada que
 * responder (`06`, D-04b: esta pantalla se llega desde una notificación
 * propia, pero no depende de nadie más para resolver eso).
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ObtenerMiInvitacionPendienteInput = z.infer<typeof esquemaEntrada>;

export interface MiInvitacionPendiente {
  equipoNombre: string;
  escudoUrl: string | null;
  roles: Array<'captain' | 'delegate' | 'player' | 'coach'>;
}

export const obtenerMiInvitacionPendiente: Servicio<
  ObtenerMiInvitacionPendienteInput,
  MiInvitacionPendiente | null
> = async (input, contexto) => {
  if (!contexto.usuarioId) return null;
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) return null;

  const { rows } = await pool.query<{
    equipo_nombre: string;
    escudo_url: string | null;
    rol_equipo: 'captain' | 'delegate' | 'player' | 'coach';
  }>(
    `SELECT e.nombre AS equipo_nombre, e.escudo_url, ie.rol_equipo
     FROM integrante_equipo ie
     JOIN equipo e ON e.id = ie.equipo_id
     WHERE ie.equipo_id = $1 AND ie.perfil_id = $2 AND ie.estado_vinculo = 'invited'`,
    [datos.equipoId, perfilId],
  );
  if (rows.length === 0) return null;

  return {
    equipoNombre: rows[0]!.equipo_nombre,
    escudoUrl: rows[0]!.escudo_url,
    roles: rows.map((fila) => fila.rol_equipo),
  };
};
