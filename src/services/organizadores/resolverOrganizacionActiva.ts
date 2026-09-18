import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { listarOrganizacionesVinculadas } from '@/lib/permisos';

/**
 * Resuelve qué organización administra quien abre el panel de
 * Organizador (`/organizador/gestionar`): a diferencia de
 * `asegurarOrganizacionPropia` (pensado para "Crear torneo", que solo
 * considera dónde la persona es Titular y crea una si no tiene
 * ninguna), acá un Administrador invitado a una organización ajena
 * también debe poder entrar a gestionarla — sin crear nada nuevo, y
 * priorizando una organización propia (Titular) por sobre una donde
 * solo colabora, si tuviera las dos.
 */

export interface OrganizacionActiva {
  organizacionId: string;
  nombre: string;
  rol: 'owner' | 'admin';
}

export const resolverOrganizacionActiva: Servicio<void, OrganizacionActiva | null> = async (
  _input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const [vinculada] = await listarOrganizacionesVinculadas(contexto.usuarioId);
  if (!vinculada) return null;

  const pool = obtenerPool();
  const { rows } = await pool.query<{ nombre: string }>(
    'SELECT nombre FROM organizacion WHERE id = $1',
    [vinculada.organizacionId],
  );

  return {
    organizacionId: vinculada.organizacionId,
    nombre: rows[0]?.nombre ?? '',
    rol: vinculada.rol,
  };
};
