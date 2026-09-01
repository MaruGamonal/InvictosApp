import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError, esErrorDeAplicacion } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-27 — Confirmar la lista de buena fe de un equipo en un torneo
 * puntual: no es el plantel permanente (T19), es un rol **por
 * torneo** — un jugador del plantel puede no estar en la lista de este
 * torneo puntual, o figurar como cuerpo técnico donde no juega (`04`,
 * 3.7).
 *
 * Reemplaza la lista completa en cada confirmación (`10`, 2.6): es el
 * mismo criterio que un formulario que se reenvía entero, no un alta
 * incremental. El cuerpo técnico no ocupa cupo de jugadores (`06`,
 * D-24). La unicidad de un jugador entre equipos del mismo torneo
 * (`06`, D-17b) la aplica el trigger de `integrante_habilitado` (T2):
 * este servicio solo traduce esa excepción de Postgres al código
 * tipado del catálogo.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  equipoId: z.string().uuid(),
  integrantes: z
    .array(
      z.object({
        perfilId: z.string().uuid(),
        rolEnTorneo: z.enum(['player', 'coach', 'delegate']),
        numeroCamiseta: z.number().int().positive().optional(),
      }),
    )
    .min(1),
});
export type ConfirmarPlantelInput = z.infer<typeof esquemaEntrada>;

export interface ConfirmarPlantelResultado {
  cantidadJugadores: number;
  advertenciaMinimoNoAlcanzado: boolean;
}

export const confirmarPlantel: Servicio<ConfirmarPlantelInput, ConfirmarPlantelResultado> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilId, datos.equipoId, 'inscribir_a_torneo');

  const { rows: inscripcionRows } = await pool.query<{ estado: string }>(
    'SELECT estado FROM inscripcion WHERE torneo_id = $1 AND equipo_id = $2',
    [datos.torneoId, datos.equipoId],
  );
  if (!inscripcionRows[0]) throw crearError('NO_ENCONTRADO');

  const { rows: torneoRows } = await pool.query<{
    min_jugadores_lista: number | null;
    max_jugadores_lista: number | null;
    fecha_cierre_lista_buena_fe: Date | null;
  }>(
    'SELECT min_jugadores_lista, max_jugadores_lista, fecha_cierre_lista_buena_fe FROM torneo WHERE id = $1',
    [datos.torneoId],
  );
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  if (
    torneo.fecha_cierre_lista_buena_fe &&
    torneo.fecha_cierre_lista_buena_fe.getTime() < Date.now()
  ) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'torneoId',
        problema: 'Este torneo ya cerró las incorporaciones a la lista de buena fe.',
      },
    ]);
  }

  const { rows: plantelActivo } = await pool.query<{ perfil_id: string }>(
    `SELECT perfil_id FROM integrante_equipo WHERE equipo_id = $1 AND estado_vinculo = 'active'`,
    [datos.equipoId],
  );
  const perfilesDelPlantel = new Set(plantelActivo.map((f) => f.perfil_id));
  for (const integrante of datos.integrantes) {
    if (!perfilesDelPlantel.has(integrante.perfilId)) {
      throw crearError('DATOS_INVALIDOS', [
        {
          campo: 'integrantes',
          problema: 'Solo se puede anotar a quien integra el plantel del equipo.',
        },
      ]);
    }
  }

  const jugadores = datos.integrantes.filter((i) => i.rolEnTorneo === 'player');
  if (torneo.max_jugadores_lista !== null && jugadores.length > torneo.max_jugadores_lista) {
    throw crearError('EXCEDE_MAXIMO_PLANTEL');
  }
  const advertenciaMinimoNoAlcanzado =
    torneo.min_jugadores_lista !== null && jugadores.length < torneo.min_jugadores_lista;

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      'DELETE FROM integrante_habilitado WHERE torneo_id = $1 AND equipo_id = $2',
      [datos.torneoId, datos.equipoId],
    );

    for (const integrante of datos.integrantes) {
      await cliente.query(
        `INSERT INTO integrante_habilitado (torneo_id, equipo_id, perfil_id, rol_en_torneo, numero_camiseta)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          datos.torneoId,
          datos.equipoId,
          integrante.perfilId,
          integrante.rolEnTorneo,
          integrante.numeroCamiseta ?? null,
        ],
      );
    }

    await cliente.query(
      'UPDATE inscripcion SET plantel_confirmado = true WHERE torneo_id = $1 AND equipo_id = $2',
      [datos.torneoId, datos.equipoId],
    );

    await cliente.query('COMMIT');
    return { cantidadJugadores: jugadores.length, advertenciaMinimoNoAlcanzado };
  } catch (error) {
    await cliente.query('ROLLBACK');
    if (
      !esErrorDeAplicacion(error) &&
      error instanceof Error &&
      error.message.includes('JUGADOR_YA_HABILITADO_EN_EL_TORNEO')
    ) {
      throw crearError('JUGADOR_YA_HABILITADO_EN_EL_TORNEO');
    }
    throw error;
  } finally {
    cliente.release();
  }
};
