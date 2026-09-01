import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { decodificarCursor, paginar } from '@/lib/paginacion';
import { TIPOS_NOTIFICACION, esAccionable, type TipoNotificacion } from './tipos';

/**
 * UC-46 — El centro de notificaciones del MVP muestra solo el
 * subconjunto accionable (`07`, D11): lo informativo se consulta desde
 * el feed de actividad (T32), no desde acá.
 */

const TIPOS_ACCIONABLES = TIPOS_NOTIFICACION.filter(esAccionable);
const TAMANO_PAGINA_DEFECTO = 20;

const esquemaEntrada = z.object({
  cursor: z.string().optional(),
  tamanoPagina: z.number().int().positive().max(50).optional(),
});
export type ListarNotificacionesInput = z.infer<typeof esquemaEntrada>;

export interface NotificacionListada {
  id: string;
  tipo: TipoNotificacion;
  entidadOrigenTipo: string | null;
  entidadOrigenId: string | null;
  canal: 'in_app' | 'email';
  estado: 'pending' | 'delivered' | 'read';
  fechaGeneracion: string;
}

interface FilaNotificacion {
  id: string;
  tipo: TipoNotificacion;
  entidad_origen_tipo: string | null;
  entidad_origen_id: string | null;
  canal: 'in_app' | 'email';
  estado: 'pending' | 'delivered' | 'read';
  fecha_generacion: Date;
}

export const listarNotificaciones: Servicio<
  ListarNotificacionesInput,
  { notificaciones: NotificacionListada[]; cursorSiguiente: string | null }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);
  const tamanoPagina = datos.tamanoPagina ?? TAMANO_PAGINA_DEFECTO;

  const valores: unknown[] = [contexto.usuarioId, TIPOS_ACCIONABLES];
  let condicionCursor = '';
  if (datos.cursor) {
    const [fecha, id] = decodificarCursor(datos.cursor);
    valores.push(fecha, id);
    condicionCursor = `AND (fecha_generacion > $${valores.length - 1}
      OR (fecha_generacion = $${valores.length - 1} AND id > $${valores.length}))`;
  }
  valores.push(tamanoPagina + 1);

  const pool = obtenerPool();
  const { rows } = await pool.query<FilaNotificacion>(
    `SELECT id, tipo, entidad_origen_tipo, entidad_origen_id, canal, estado, fecha_generacion
     FROM notificacion
     WHERE usuario_id = $1 AND canal = 'in_app' AND tipo = ANY($2) ${condicionCursor}
     ORDER BY fecha_generacion ASC, id ASC
     LIMIT $${valores.length}`,
    valores,
  );

  const { pagina, cursorSiguiente } = paginar(rows, {
    tamanoPagina,
    obtenerClave: (fila) => [fila.fecha_generacion.toISOString(), fila.id],
  });

  return {
    notificaciones: pagina.map((fila) => ({
      id: fila.id,
      tipo: fila.tipo,
      entidadOrigenTipo: fila.entidad_origen_tipo,
      entidadOrigenId: fila.entidad_origen_id,
      canal: fila.canal,
      estado: fila.estado,
      fechaGeneracion: fila.fecha_generacion.toISOString(),
    })),
    cursorSiguiente,
  };
};
