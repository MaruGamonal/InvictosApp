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
 *
 * `organizacionIdPreferida` es la que la persona eligió en "Mis
 * organizaciones", y **se valida contra sus vínculos reales**: llega de
 * una cookie, que el cliente controla, así que poner ahí el id de una
 * organización ajena no puede darle acceso. Si no es una de las suyas
 * —o dejó de serlo— se ignora y se cae a la primera, en vez de fallar:
 * una preferencia vieja no debería dejar a nadie afuera de su propio
 * panel.
 */

export interface OrganizacionActiva {
  organizacionId: string;
  nombre: string;
  rol: 'owner' | 'admin';
}

export interface ResolverOrganizacionActivaInput {
  organizacionIdPreferida?: string | undefined;
}

export const resolverOrganizacionActiva: Servicio<
  ResolverOrganizacionActivaInput | void,
  OrganizacionActiva | null
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const vinculadas = await listarOrganizacionesVinculadas(contexto.usuarioId);
  const preferida = input?.organizacionIdPreferida;
  const vinculada =
    (preferida ? vinculadas.find((v) => v.organizacionId === preferida) : undefined) ??
    vinculadas[0];
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
