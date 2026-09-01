import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';

/** UC-07 — Listar el equipo de trabajo de una organización (Titular y Administradores). */

const esquemaEntrada = z.object({ organizacionId: z.string().uuid() });
export type ListarMiembrosInput = z.infer<typeof esquemaEntrada>;

export interface MiembroListado {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  rol: 'owner' | 'admin';
  estado: 'invited' | 'active' | 'inactive';
}

export const listarMiembros: Servicio<ListarMiembrosInput, MiembroListado[]> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'actualizar_organizacion');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    usuario_id: string;
    nombre_completo: string;
    email: string;
    rol: 'owner' | 'admin';
    estado: 'invited' | 'active' | 'inactive';
  }>(
    `SELECT mo.usuario_id, u.nombre_completo, u.email, mo.rol, u.estado
     FROM miembro_organizacion mo
     JOIN usuario u ON u.id = mo.usuario_id
     WHERE mo.organizacion_id = $1
     ORDER BY mo.rol, u.nombre_completo`,
    [datos.organizacionId],
  );

  return rows.map((fila) => ({
    usuarioId: fila.usuario_id,
    nombreCompleto: fila.nombre_completo,
    email: fila.email,
    rol: fila.rol,
    estado: fila.estado,
  }));
};
