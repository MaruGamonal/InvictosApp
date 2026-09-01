import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * Panel de inscripciones del organizador, apoyado en el índice
 * `inscripcion (torneo_id, estado)` (`10`, 3.3). Cada fila con
 * `advertenciaCategoria` en `true` es información para decidir, no un
 * bloqueo (`06`, D-82): el organizador aprueba o rechaza igual con ese
 * dato a la vista.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  estado: z
    .enum(['pending', 'approved', 'rejected', 'withdrawn', 'excluded', 'waitlisted'])
    .optional(),
});
export type ListarInscripcionesInput = z.infer<typeof esquemaEntrada>;

export interface InscripcionListada {
  equipoId: string;
  nombreEquipo: string;
  estado: string;
  advertenciaCategoria: boolean;
  motivoEstado: string | null;
  motivoEstadoDetalle: string | null;
  fechaSolicitud: string;
}

export const listarInscripciones: Servicio<ListarInscripcionesInput, InscripcionListada[]> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'resolver_inscripciones');

  const condiciones = ['i.torneo_id = $1'];
  const valores: unknown[] = [datos.torneoId];
  if (datos.estado) {
    valores.push(datos.estado);
    condiciones.push(`i.estado = $${valores.length}`);
  }

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    equipo_id: string;
    nombre: string;
    estado: string;
    advertencia_categoria: boolean;
    motivo_estado: string | null;
    motivo_estado_detalle: string | null;
    fecha_solicitud: Date;
  }>(
    `SELECT i.equipo_id, e.nombre, i.estado, i.advertencia_categoria, i.motivo_estado, i.motivo_estado_detalle, i.fecha_solicitud
     FROM inscripcion i
     JOIN equipo e ON e.id = i.equipo_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY i.fecha_solicitud ASC`,
    valores,
  );

  return rows.map((fila) => ({
    equipoId: fila.equipo_id,
    nombreEquipo: fila.nombre,
    estado: fila.estado,
    advertenciaCategoria: fila.advertencia_categoria,
    motivoEstado: fila.motivo_estado,
    motivoEstadoDetalle: fila.motivo_estado_detalle,
    fechaSolicitud: fila.fecha_solicitud.toISOString(),
  }));
};
