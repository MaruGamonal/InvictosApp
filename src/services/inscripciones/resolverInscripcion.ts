import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';
import { notificar } from '@/services/notificaciones/notificar';
import { cerrarTorneoSiCupoCompleto } from './_cupo';

/**
 * UC-25 — Aprobar o rechazar una inscripción. El organizador **siempre**
 * decide quién entra: no está entre los permisos fijos del Colaborador
 * (`06`, D-32), aunque esté asignado a ese torneo.
 *
 * Es una de las cuatro operaciones transaccionales del MVP (`10`, 2.5):
 * aprobar y cerrar el torneo al completarse el cupo pasan juntos, en la
 * misma transacción.
 *
 * `wrong_division` (`06`, D-108) es el único motivo de rechazo con un
 * comportamiento distinto: no existe `reasignarInscripcion` —la
 * identidad de `inscripcion` es `(torneo_id, equipo_id)`— así que se
 * rechaza señalando el `torneoId` de la división que corresponde en
 * `motivoDetalle`, y la notificación al capitán enlaza directo a esa
 * ficha para que se inscriba ahí. La división sugerida tiene que ser
 * otro torneo del mismo certamen — nunca uno de otro evento.
 */

const esquemaEntrada = z
  .object({
    torneoId: z.string().uuid(),
    equipoId: z.string().uuid(),
    decision: z.enum(['approved', 'rejected']),
    motivo: z
      .enum(['withdrew', 'no_show', 'roster_incomplete', 'disciplinary', 'wrong_division', 'other'])
      .optional(),
    motivoDetalle: z.string().trim().min(1).optional(),
  })
  .refine((d) => d.decision !== 'rejected' || Boolean(d.motivo), {
    message: 'Rechazar una inscripción requiere un motivo.',
    path: ['motivo'],
  })
  .refine((d) => d.motivo !== 'other' || Boolean(d.motivoDetalle), {
    message: 'Con motivo "other" hace falta el texto libre.',
    path: ['motivoDetalle'],
  })
  .refine(
    (d) => d.motivo !== 'wrong_division' || z.string().uuid().safeParse(d.motivoDetalle).success,
    {
      message: 'Con motivo "wrong_division" hace falta el torneoId de la división sugerida.',
      path: ['motivoDetalle'],
    },
  );
export type ResolverInscripcionInput = z.infer<typeof esquemaEntrada>;

export const resolverInscripcion: Servicio<
  ResolverInscripcionInput,
  { estado: 'approved' | 'rejected' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'resolver_inscripciones');

  const pool = obtenerPool();

  let torneoIdParaNotificar = datos.torneoId;
  if (datos.motivo === 'wrong_division') {
    const { rows: sugeridaRows } = await pool.query(
      `SELECT ts.id FROM torneo ts
       JOIN torneo torigen ON torigen.certamen_id = ts.certamen_id
       WHERE ts.id = $1 AND torigen.id = $2 AND ts.certamen_id IS NOT NULL`,
      [datos.motivoDetalle, datos.torneoId],
    );
    if (!sugeridaRows[0]) {
      throw crearError('DATOS_INVALIDOS', [
        {
          campo: 'motivoDetalle',
          problema: 'La división sugerida tiene que ser otro torneo del mismo certamen.',
        },
      ]);
    }
    torneoIdParaNotificar = datos.motivoDetalle!;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rowCount } = await cliente.query(
      `UPDATE inscripcion
       SET estado = $3, motivo_estado = $4, motivo_estado_detalle = $5,
           resuelta_por_usuario_id = $6, fecha_resolucion = now()
       WHERE torneo_id = $1 AND equipo_id = $2 AND estado IN ('pending', 'waitlisted')`,
      [
        datos.torneoId,
        datos.equipoId,
        datos.decision,
        datos.motivo ?? null,
        datos.motivoDetalle ?? null,
        contexto.usuarioId,
      ],
    );
    if (!rowCount) throw crearError('NO_ENCONTRADO');

    if (datos.decision === 'approved') {
      await cerrarTorneoSiCupoCompleto(cliente, datos.torneoId);
    }

    await cliente.query('COMMIT');
    invalidarCacheTorneo(datos.torneoId);
    invalidarCacheEquipo(datos.equipoId);

    const { rows: gestores } = await pool.query<{ usuario_id: string | null }>(
      `SELECT pd.usuario_id
       FROM integrante_equipo ie
       JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
       WHERE ie.equipo_id = $1 AND ie.estado_vinculo = 'active' AND ie.rol_equipo IN ('captain', 'delegate')`,
      [datos.equipoId],
    );
    const usuarioIds = gestores.map((g) => g.usuario_id).filter((id): id is string => id !== null);
    if (usuarioIds.length > 0) {
      await notificar(
        {
          tipo: 'registration_resolved',
          entidadOrigenTipo: 'torneo',
          entidadOrigenId: torneoIdParaNotificar,
          destinatarios: { usuarioIds },
        },
        contexto,
      );
    }

    return { estado: datos.decision };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
