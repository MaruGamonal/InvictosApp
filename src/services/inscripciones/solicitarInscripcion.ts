import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-24 — Inscribir al equipo en un torneo, del lado del Capitán o
 * Delegado. Idempotente (`10`, 2.6): con una inscripción vigente ya
 * existente, devuelve la existente en vez de duplicar o fallar.
 *
 * Si el torneo tiene reglamento, hay que aceptar **la versión vigente
 * exacta** —guardando qué versión y cuándo (`06`, D-54)—; sin
 * reglamento, este paso no existe (`06`, D-29). Si el reglamento
 * cambia después, no se pide re-aceptar: eso lo explica T11/T10 con la
 * notificación de cambio.
 *
 * `advertencia_categoria` (`06`, D-82) **no es un error tipado**: la
 * inscripción se crea igual y la bandera se calcula y guarda al crear,
 * no se deriva después — si el equipo cambia de categoría más tarde,
 * el organizador sigue viendo la advertencia con la que aprobó.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  equipoId: z.string().uuid(),
  aceptoReglamentoVersion: z.number().int().positive().optional(),
});
export type SolicitarInscripcionInput = z.infer<typeof esquemaEntrada>;

export interface SolicitarInscripcionResultado {
  estado: 'pending' | 'waitlisted' | 'approved';
  advertenciaCategoria: boolean;
}

const ESTADOS_VIGENTES = ['pending', 'approved', 'waitlisted'];

export const solicitarInscripcion: Servicio<
  SolicitarInscripcionInput,
  SolicitarInscripcionResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilId, datos.equipoId, 'inscribir_a_torneo');

  const { rows: torneoRows } = await pool.query<{
    estado: string;
    categoria_genero: string;
    cupo_equipos: number;
    admite_lista_espera: boolean;
  }>(
    'SELECT estado, categoria_genero, cupo_equipos, admite_lista_espera FROM torneo WHERE id = $1',
    [datos.torneoId],
  );
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  if (torneo.estado !== 'registration_open') throw crearError('INSCRIPCIONES_CERRADAS');

  const { rows: existenteRows } = await pool.query<{
    estado: string;
    advertencia_categoria: boolean;
  }>(
    'SELECT estado, advertencia_categoria FROM inscripcion WHERE torneo_id = $1 AND equipo_id = $2',
    [datos.torneoId, datos.equipoId],
  );
  const existente = existenteRows[0];
  if (existente && ESTADOS_VIGENTES.includes(existente.estado)) {
    return {
      estado: existente.estado as SolicitarInscripcionResultado['estado'],
      advertenciaCategoria: existente.advertencia_categoria,
    };
  }

  const { rows: reglamentoRows } = await pool.query<{ numero_version: number }>(
    `SELECT numero_version FROM reglamento WHERE torneo_id = $1 AND estado = 'current'`,
    [datos.torneoId],
  );
  const reglamentoVigente = reglamentoRows[0];
  if (reglamentoVigente && datos.aceptoReglamentoVersion !== reglamentoVigente.numero_version) {
    throw crearError('REGLAMENTO_NO_ACEPTADO');
  }

  const { rows: equipoRows } = await pool.query<{ categoria_genero: string }>(
    'SELECT categoria_genero FROM equipo WHERE id = $1',
    [datos.equipoId],
  );
  const equipo = equipoRows[0];
  if (!equipo) throw crearError('NO_ENCONTRADO');
  const advertenciaCategoria =
    torneo.categoria_genero !== 'mixed' && equipo.categoria_genero !== torneo.categoria_genero;

  const { rows: aprobadosRows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM inscripcion WHERE torneo_id = $1 AND estado = 'approved'`,
    [datos.torneoId],
  );
  let estado: SolicitarInscripcionResultado['estado'] = 'pending';
  if (Number(aprobadosRows[0]!.count) >= torneo.cupo_equipos) {
    if (!torneo.admite_lista_espera) throw crearError('CUPO_COMPLETO');
    estado = 'waitlisted';
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `INSERT INTO inscripcion
         (torneo_id, equipo_id, estado, advertencia_categoria, solicitada_por_usuario_id,
          reglamento_version_aceptada, fecha_aceptacion_reglamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (torneo_id, equipo_id) DO UPDATE SET
         estado = EXCLUDED.estado,
         advertencia_categoria = EXCLUDED.advertencia_categoria,
         solicitada_por_usuario_id = EXCLUDED.solicitada_por_usuario_id,
         reglamento_version_aceptada = EXCLUDED.reglamento_version_aceptada,
         fecha_aceptacion_reglamento = EXCLUDED.fecha_aceptacion_reglamento,
         fecha_solicitud = now(),
         motivo_estado = NULL,
         motivo_estado_detalle = NULL,
         resuelta_por_usuario_id = NULL,
         fecha_resolucion = NULL`,
      [
        datos.torneoId,
        datos.equipoId,
        estado,
        advertenciaCategoria,
        contexto.usuarioId,
        reglamentoVigente?.numero_version ?? null,
        reglamentoVigente ? new Date() : null,
      ],
    );

    const { rows: integrantes } = await cliente.query<{ usuario_id: string | null }>(
      `SELECT pd.usuario_id
       FROM integrante_equipo ie
       JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
       WHERE ie.equipo_id = $1 AND ie.estado_vinculo = 'active' AND pd.usuario_id IS NOT NULL`,
      [datos.equipoId],
    );
    for (const integrante of integrantes) {
      await cliente.query(
        `INSERT INTO seguimiento (usuario_id, tipo_seguido, entidad_seguida_id, origen)
         VALUES ($1, 'tournament', $2, 'automatico')
         ON CONFLICT (usuario_id, tipo_seguido, entidad_seguida_id) DO NOTHING`,
        [integrante.usuario_id, datos.torneoId],
      );
    }

    await cliente.query('COMMIT');
    return { estado, advertenciaCategoria };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
