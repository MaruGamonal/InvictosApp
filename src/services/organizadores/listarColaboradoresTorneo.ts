import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-52 — Colaboradores de este torneo puntual, para gestionarlos: el
 * vínculo es con el torneo, no con la organización (`06`, D-32, D-34) —
 * sacar a alguien de acá no lo saca de otros torneos donde también
 * colabore.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ListarColaboradoresTorneoInput = z.infer<typeof esquemaEntrada>;

export interface ColaboradorTorneo {
  usuarioId: string;
  nombreVisible: string;
  fechaAsignacion: string;
}

export const listarColaboradoresTorneo: Servicio<
  ListarColaboradoresTorneoInput,
  ColaboradorTorneo[]
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'asignar_colaboradores');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    usuario_id: string;
    nombre_visible: string | null;
    email: string;
    fecha_asignacion: Date;
  }>(
    `SELECT ct.usuario_id, pd.nombre_visible, u.email, ct.fecha_asignacion
     FROM colaborador_torneo ct
     JOIN usuario u ON u.id = ct.usuario_id
     LEFT JOIN perfil_deportivo pd ON pd.usuario_id = ct.usuario_id
     WHERE ct.torneo_id = $1 AND ct.estado = 'active'
     ORDER BY ct.fecha_asignacion ASC`,
    [datos.torneoId],
  );

  return rows.map((fila) => ({
    usuarioId: fila.usuario_id,
    nombreVisible: fila.nombre_visible ?? fila.email,
    fechaAsignacion: fila.fecha_asignacion.toISOString(),
  }));
};
