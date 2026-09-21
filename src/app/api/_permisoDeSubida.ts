import { obtenerPool } from '@/db/cliente';
import type { Contexto } from '@/lib/contexto';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * Las rutas de subida guardaban el archivo y **después** llamaban al
 * servicio que comprueba el permiso. El rechazo llegaba tarde: para
 * entonces el archivo ya estaba en el bucket público y accesible por su
 * URL. Cualquiera con sesión podía escribir archivos a nombre de
 * cualquier equipo, organización o torneo — el `UPDATE` fallaba, el
 * archivo quedaba.
 *
 * Por eso estas rutas comprueban el permiso antes de tocar el
 * almacenamiento. El servicio vuelve a comprobarlo después, que es lo
 * correcto: esto se adelanta al gasto, no lo reemplaza.
 */
export async function verificarPuedeSubirAlEquipo(
  contexto: Contexto,
  equipoId: string,
): Promise<void> {
  const { rows } = await obtenerPool().query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  await verificarPermisoEquipo(contexto, rows[0]?.id ?? null, equipoId, 'gestionar_plantel');
}
