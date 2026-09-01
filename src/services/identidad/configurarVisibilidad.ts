import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/** UC-04 — Visibilidad binaria del perfil (`06`, D-14b): pública o restringida. */

const esquemaEntrada = z.object({ visibilidad: z.enum(['public', 'restricted']) });
export type ConfigurarVisibilidadInput = z.infer<typeof esquemaEntrada>;

export const configurarVisibilidad: Servicio<
  ConfigurarVisibilidadInput,
  { visibilidad: 'public' | 'restricted' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rowCount } = await pool.query(
    'UPDATE perfil_deportivo SET visibilidad = $1 WHERE usuario_id = $2',
    [datos.visibilidad, contexto.usuarioId],
  );
  if (rowCount === 0) throw crearError('NO_ENCONTRADO');

  return { visibilidad: datos.visibilidad };
};
