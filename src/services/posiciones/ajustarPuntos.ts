import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-35 — Quita o bonificación de puntos aplicada por el organizador
 * (`06`, D-35b). Escribe **únicamente en `ajuste_puntos`, nunca en
 * `puntos`**: la tabla suma ambas columnas al ordenar y al mostrar, pero
 * mantiene separado cuánto ganó un equipo en la cancha de cuánto le
 * sacaron — es lo que la mantiene explicable.
 *
 * Solo Titular o Administrador (`configurar_torneo` no está entre las
 * acciones de Colaborador, `06` D-32): sancionar un equipo no es una
 * tarea operativa de fecha a fecha.
 *
 * La fila de `posicion` a ajustar es la del `grupo_id` vigente del
 * equipo en ese torneo (`inscripcion.grupo_id`, asignado por
 * `confirmarFixture`, T13): un equipo puede tener como máximo una tabla
 * activa por torneo en el MVP.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  equipoId: z.string().uuid(),
  ajuste: z
    .number()
    .int()
    .refine((n) => n !== 0, 'El ajuste no puede ser cero.'),
  motivo: z.string().trim().min(1),
});
export type AjustarPuntosInput = z.infer<typeof esquemaEntrada>;

export interface PosicionActualizada {
  grupoId: string;
  equipoId: string;
  puntos: number;
  ajustePuntos: number;
}

export const ajustarPuntos: Servicio<AjustarPuntosInput, PosicionActualizada> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows: inscripcionRows } = await pool.query<{ grupo_id: string | null }>(
    'SELECT grupo_id FROM inscripcion WHERE torneo_id = $1 AND equipo_id = $2',
    [datos.torneoId, datos.equipoId],
  );
  const grupoId = inscripcionRows[0]?.grupo_id;
  if (!grupoId) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'equipoId',
        problema: 'Este equipo todavía no tiene una tabla de posiciones asignada en este torneo.',
      },
    ]);
  }

  const { rows } = await pool.query<{ puntos: number; ajuste_puntos: number }>(
    `INSERT INTO posicion (grupo_id, equipo_id, ajuste_puntos, ultimo_ajuste_motivo, ultimo_ajuste_por_usuario_id, ultimo_ajuste_fecha, ultima_actualizacion)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     ON CONFLICT (grupo_id, equipo_id) DO UPDATE SET
       ajuste_puntos = posicion.ajuste_puntos + EXCLUDED.ajuste_puntos,
       ultimo_ajuste_motivo = EXCLUDED.ultimo_ajuste_motivo,
       ultimo_ajuste_por_usuario_id = EXCLUDED.ultimo_ajuste_por_usuario_id,
       ultimo_ajuste_fecha = now(),
       ultima_actualizacion = now()
     RETURNING puntos, ajuste_puntos`,
    [grupoId, datos.equipoId, datos.ajuste, datos.motivo, contexto.usuarioId],
  );

  const posicion = rows[0]!;
  return {
    grupoId,
    equipoId: datos.equipoId,
    puntos: posicion.puntos,
    ajustePuntos: posicion.ajuste_puntos,
  };
};
