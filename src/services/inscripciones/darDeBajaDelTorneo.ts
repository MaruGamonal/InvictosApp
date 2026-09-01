import { z } from 'zod';
import type { Contexto } from '@/lib/contexto';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError, esErrorDeAplicacion } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo, verificarPermisoTorneo } from '@/lib/permisos';
import { aplicarEfectoAUnEquipo } from '@/services/posiciones/_recalcularPosicion';
import { promoverListaDeEspera } from './_cupo';

/**
 * UC-28 — Dar de baja a un equipo del torneo, con dos iniciadores que
 * determinan el estado resultante, no un valor que elige quien llama
 * (`02`, UC-28): el **Capitán se retira** (`withdrawn`), el **Titular o
 * Administrador lo excluye** (`excluded`). Se prueba primero si es
 * capitán del equipo — reutilizando `accion_de_capitan` (T19): es una
 * decisión tan exclusiva del capitán como designar roles o archivar el
 * equipo — y si no, se exige el permiso de organización.
 *
 * **Antes de empezar el torneo**, es simple: libera el cupo y promueve
 * al primero de la lista de espera si el equipo que se fue estaba
 * `approved` (`_cupo.ts`, ya preparada por T12 para este momento).
 *
 * **Con el torneo en curso**, según `torneo.partidos_pendientes_por_abandono`
 * (`06`, D-08b, T9): los partidos **ya jugados se mantienen** (no se
 * tocan); los **pendientes** —ni jugados ni ya resueltos como
 * walkover/cancelled— se dan por ganados a sus rivales como `walkover`
 * (default `ganados_por_rival`) o se anulan (`anulados`). El walkover usa
 * `aplicarEfectoAUnEquipo`: **recalcula la posición de cada rival, nunca
 * la del equipo que se va** — a diferencia de `cargarResultado`/
 * `registrarNoDisputado` (T15/T16), acá solo un lado del partido importa.
 *
 * Una de las cuatro operaciones transaccionales del MVP (`10`, 2.5):
 * inscripción, partidos y posiciones afectadas se escriben juntos.
 *
 * UC-28 no tiene `Notificación` entre sus entidades involucradas (`02`)
 * ni el alcance técnico de T17 (`11`) la menciona: no se notifica acá.
 */

const MOTIVOS = ['withdrew', 'no_show', 'roster_incomplete', 'disciplinary', 'other'] as const;

const esquemaEntrada = z
  .object({
    torneoId: z.string().uuid(),
    equipoId: z.string().uuid(),
    motivo: z.enum(MOTIVOS),
    motivoDetalle: z.string().trim().min(1).optional(),
  })
  .refine((d) => d.motivo !== 'other' || Boolean(d.motivoDetalle), {
    message: 'Con motivo "other" hace falta describir qué pasó.',
  });
export type DarDeBajaDelTorneoInput = z.infer<typeof esquemaEntrada>;

export interface DarDeBajaDelTorneoResultado {
  estado: 'withdrawn' | 'excluded';
  equipoPromovidoDeListaDeEspera: string | null;
  partidosAfectados: number;
}

interface FilaInscripcion {
  estado: string;
}

interface FilaTorneo {
  estado: string;
  partidos_pendientes_por_abandono: 'ganados_por_rival' | 'anulados';
  goles_walkover_ganador: number;
  goles_walkover_perdedor: number;
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
}

interface FilaPartidoPendiente {
  id: string;
  grupo_id: string | null;
  equipo_local_id: string;
  equipo_visitante_id: string;
}

const ESTADOS_TERMINALES = new Set(['withdrawn', 'excluded', 'rejected']);
const ESTADOS_PENDIENTES_DE_RESOLUCION = ['unscheduled', 'scheduled', 'postponed'];

async function esCapitanDelEquipo(contexto: Contexto, equipoId: string): Promise<boolean> {
  if (!contexto.usuarioId) return false;
  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = rows[0]?.id;
  if (!perfilId) return false;

  try {
    await verificarPermisoEquipo(contexto, perfilId, equipoId, 'accion_de_capitan');
    return true;
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'SIN_PERMISO') return false;
    throw error;
  }
}

export const darDeBajaDelTorneo: Servicio<
  DarDeBajaDelTorneoInput,
  DarDeBajaDelTorneoResultado
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows: inscripcionRows } = await pool.query<FilaInscripcion>(
    'SELECT estado FROM inscripcion WHERE torneo_id = $1 AND equipo_id = $2',
    [datos.torneoId, datos.equipoId],
  );
  const inscripcion = inscripcionRows[0];
  if (!inscripcion) throw crearError('NO_ENCONTRADO');
  if (ESTADOS_TERMINALES.has(inscripcion.estado)) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'equipoId',
        problema: 'Este equipo ya no tiene una inscripción activa en este torneo.',
      },
    ]);
  }

  let estadoResultante: 'withdrawn' | 'excluded';
  if (await esCapitanDelEquipo(contexto, datos.equipoId)) {
    estadoResultante = 'withdrawn';
  } else {
    await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');
    estadoResultante = 'excluded';
  }

  const { rows: torneoRows } = await pool.query<FilaTorneo>(
    `SELECT estado, partidos_pendientes_por_abandono, goles_walkover_ganador, goles_walkover_perdedor,
            puntos_victoria, puntos_empate, puntos_derrota
     FROM torneo WHERE id = $1`,
    [datos.torneoId],
  );
  const torneo = torneoRows[0]!;

  const cliente = await pool.connect();
  let equipoPromovidoDeListaDeEspera: string | null = null;
  let partidosAfectados = 0;
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `UPDATE inscripcion
       SET estado = $3, motivo_estado = $4, motivo_estado_detalle = $5,
           resuelta_por_usuario_id = $6, fecha_resolucion = now()
       WHERE torneo_id = $1 AND equipo_id = $2`,
      [
        datos.torneoId,
        datos.equipoId,
        estadoResultante,
        datos.motivo,
        datos.motivoDetalle ?? null,
        contexto.usuarioId,
      ],
    );

    if (inscripcion.estado === 'approved' && torneo.estado !== 'in_progress') {
      equipoPromovidoDeListaDeEspera = await promoverListaDeEspera(cliente, datos.torneoId);
    }

    if (inscripcion.estado === 'approved' && torneo.estado === 'in_progress') {
      const { rows: partidos } = await cliente.query<FilaPartidoPendiente>(
        `SELECT id, grupo_id, equipo_local_id, equipo_visitante_id
         FROM partido
         WHERE torneo_id = $1 AND estado = ANY($2)
           AND (equipo_local_id = $3 OR equipo_visitante_id = $3)`,
        [datos.torneoId, ESTADOS_PENDIENTES_DE_RESOLUCION, datos.equipoId],
      );

      for (const partido of partidos) {
        const seAnula = torneo.partidos_pendientes_por_abandono === 'anulados';
        const equipoGanador = seAnula
          ? null
          : partido.equipo_local_id === datos.equipoId
            ? partido.equipo_visitante_id
            : partido.equipo_local_id;
        const ganaLocal = equipoGanador === partido.equipo_local_id;
        const golesLocal = seAnula
          ? null
          : ganaLocal
            ? torneo.goles_walkover_ganador
            : torneo.goles_walkover_perdedor;
        const golesVisitante = seAnula
          ? null
          : ganaLocal
            ? torneo.goles_walkover_perdedor
            : torneo.goles_walkover_ganador;

        await cliente.query(
          `UPDATE partido
           SET estado = $2, motivo_no_disputado = $3, goles_local = $4, goles_visitante = $5,
               estado_resultado = $6, cargado_por_usuario_id = $7, fecha_carga_resultado = $8,
               version = version + 1
           WHERE id = $1`,
          [
            partido.id,
            seAnula ? 'cancelled' : 'walkover',
            `El equipo rival se dio de baja del torneo (motivo: ${datos.motivo}).`,
            golesLocal,
            golesVisitante,
            seAnula ? 'pending' : 'confirmed',
            seAnula ? null : contexto.usuarioId,
            seAnula ? null : new Date(),
          ],
        );

        if (!seAnula && partido.grupo_id) {
          const golesEquipoGanador = ganaLocal ? golesLocal! : golesVisitante!;
          const golesEquipoQueSeVa = ganaLocal ? golesVisitante! : golesLocal!;
          await aplicarEfectoAUnEquipo(
            cliente,
            partido.grupo_id,
            equipoGanador!,
            golesEquipoGanador,
            golesEquipoQueSeVa,
            {
              puntosVictoria: torneo.puntos_victoria,
              puntosEmpate: torneo.puntos_empate,
              puntosDerrota: torneo.puntos_derrota,
            },
          );
        }
        partidosAfectados += 1;
      }
    }

    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }

  return { estado: estadoResultante, equipoPromovidoDeListaDeEspera, partidosAfectados };
};
