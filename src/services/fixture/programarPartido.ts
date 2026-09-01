import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { notificar } from '@/services/notificaciones/notificar';

/**
 * UC-30 — Asignar o cambiar fecha, hora y sede de un partido. Un
 * partido puede quedar sin programar sin bloquear al resto del fixture
 * (`04`, 4.6).
 *
 * Se **conserva la fecha originalmente programada** (`06`, D-30): la
 * primera vez que se programa el partido, `fecha_hora_original` toma
 * ese mismo valor y ya no se vuelve a tocar en ninguna reprogramación
 * posterior — es el dato que explica qué se movió, no un registro de
 * "la fecha anterior a esta reprogramación puntual".
 *
 * Permiso: Titular, Administrador y Colaborador asignado a ese torneo
 * (`06`, D-32) — ya resuelto por `verificarPermisoTorneo` (T4).
 */

const esquemaEntrada = z
  .object({
    partidoId: z.string().uuid(),
    fechaHoraProgramada: z.string().datetime(),
    sedeId: z.string().uuid().optional(),
    sedeNueva: z
      .object({
        nombre: z.string().trim().min(1),
        direccion: z.string().trim().min(1),
        ciudadId: z.string().uuid(),
      })
      .optional(),
  })
  .refine((d) => !(d.sedeId && d.sedeNueva), {
    message: 'Hay que indicar una sede existente o los datos de una nueva, no las dos.',
  });
export type ProgramarPartidoInput = z.infer<typeof esquemaEntrada>;

export const programarPartido: Servicio<ProgramarPartidoInput, { estado: 'scheduled' }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: partidoRows } = await pool.query<{
    torneo_id: string;
    organizacion_id: string;
    estado: string;
    fecha_hora_programada: Date | null;
    equipo_local_id: string;
    equipo_visitante_id: string;
  }>(
    `SELECT p.torneo_id, t.organizacion_id, p.estado, p.fecha_hora_programada, p.equipo_local_id, p.equipo_visitante_id
     FROM partido p JOIN torneo t ON t.id = p.torneo_id
     WHERE p.id = $1`,
    [datos.partidoId],
  );
  const partido = partidoRows[0];
  if (!partido) throw crearError('NO_ENCONTRADO');
  await verificarPermisoTorneo(contexto, partido.torneo_id, 'programar_partidos');

  if (partido.estado === 'played') {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'partidoId', problema: 'Un partido ya jugado no se puede reprogramar.' },
    ]);
  }

  let sedeId = datos.sedeId ?? null;
  if (datos.sedeNueva) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO sede (nombre, direccion, ciudad_id, organizacion_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        datos.sedeNueva.nombre,
        datos.sedeNueva.direccion,
        datos.sedeNueva.ciudadId,
        partido.organizacion_id,
      ],
    );
    sedeId = rows[0]!.id;
  }

  const esPrimeraProgramacion = partido.fecha_hora_programada === null;
  const asignaciones = ["estado = 'scheduled'", 'fecha_hora_programada = $2'];
  const valores: unknown[] = [datos.partidoId, datos.fechaHoraProgramada];

  if (esPrimeraProgramacion) {
    asignaciones.push(`fecha_hora_original = $${valores.length + 1}`);
    valores.push(datos.fechaHoraProgramada);
  } else if (contexto.usuarioId) {
    asignaciones.push(`reprogramado_por_usuario_id = $${valores.length + 1}`);
    valores.push(contexto.usuarioId);
  }
  if (sedeId) {
    asignaciones.push(`sede_id = $${valores.length + 1}`);
    valores.push(sedeId);
  }
  asignaciones.push('version = version + 1');

  await pool.query(`UPDATE partido SET ${asignaciones.join(', ')} WHERE id = $1`, valores);

  const { rows: gestores } = await pool.query<{ usuario_id: string | null }>(
    `SELECT pd.usuario_id
     FROM integrante_equipo ie
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE ie.equipo_id = ANY($1) AND ie.estado_vinculo = 'active' AND ie.rol_equipo IN ('captain', 'delegate')`,
    [[partido.equipo_local_id, partido.equipo_visitante_id]],
  );
  const usuarioIds = gestores.map((g) => g.usuario_id).filter((id): id is string => id !== null);

  await notificar(
    {
      tipo: esPrimeraProgramacion ? 'match_scheduled' : 'match_rescheduled',
      entidadOrigenTipo: 'partido',
      entidadOrigenId: datos.partidoId,
      destinatarios: {
        usuarioIds,
        seguidoresDe: [{ tipoSeguido: 'tournament', entidadId: partido.torneo_id }],
      },
    },
    contexto,
  );

  return { estado: 'scheduled' };
};
