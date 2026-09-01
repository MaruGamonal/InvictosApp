import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';

/** UC-02 — El perfil deportivo propio, completo. */

export interface MiPerfil {
  id: string;
  nombreVisible: string;
  fotoUrl: string | null;
  posicion: string | null;
  ciudadId: string | null;
  visibilidad: 'public' | 'restricted';
  estadoReclamo: 'unclaimed' | 'pending' | 'claimed';
}

export const obtenerMiPerfil: Servicio<void, MiPerfil> = async (_input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    id: string;
    nombre_visible: string;
    foto_url: string | null;
    posicion: string | null;
    ciudad_id: string | null;
    visibilidad: 'public' | 'restricted';
    estado_reclamo: 'unclaimed' | 'pending' | 'claimed';
  }>(
    `SELECT id, nombre_visible, foto_url, posicion, ciudad_id, visibilidad, estado_reclamo
     FROM perfil_deportivo WHERE usuario_id = $1`,
    [contexto.usuarioId],
  );

  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  return {
    id: fila.id,
    nombreVisible: fila.nombre_visible,
    fotoUrl: fila.foto_url,
    posicion: fila.posicion,
    ciudadId: fila.ciudad_id,
    visibilidad: fila.visibilidad,
    estadoReclamo: fila.estado_reclamo,
  };
};
