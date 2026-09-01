import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';
import {
  aplicarResultadoAPosicion,
  revertirEfectoDePosicion,
} from '@/services/posiciones/_recalcularPosicion';

/**
 * UC-33 — Registrar qué pasó con un partido que no se jugó (`04`, 4.6):
 * **suspendido** (`postponed`, se reprograma después con `programarPartido`,
 * T14), **ganado por presentación** (`walkover`) o **anulado**
 * (`cancelled`). Una de las cuatro operaciones transaccionales del MVP
 * (`10`, 2.5): escribe `partido` **y** `posicion` de los dos equipos,
 * junto (`06`, D-32).
 *
 * **`walkover` es un estado propio, no "un resultado más"** (`04`, 4.6):
 * se computa con el resultado configurado del torneo
 * (`torneo.goles_walkover_ganador`/`_perdedor`, default 3-0, T9) y
 * **cuenta para la diferencia de gol** — reutiliza la misma diferencia
 * de `_recalcularPosicion.ts` que `cargarResultado` (T15), porque
 * `posicion` no distingue un walkover de un partido jugado. Lo que
 * **no** cuenta —estadísticas individuales (T30, no se tocan acá) y el
 * cómputo del score (etapa posterior)— queda fuera de lo que este
 * ticket construye (`06`, D-33b).
 *
 * Revertir un `walkover` a `postponed` o `cancelled` deshace su efecto
 * sobre `posicion` sin aplicar uno nuevo (`revertirEfectoDePosicion`).
 *
 * A diferencia de `cargarResultado` (UC-31), UC-33 no tiene
 * `Notificación` entre sus entidades involucradas (`02`) — no se
 * notifica acá.
 */

const esquemaEntrada = z
  .object({
    partidoId: z.string().uuid(),
    resolucion: z.enum(['postponed', 'walkover', 'cancelled']),
    motivo: z.string().trim().min(1).optional(),
    equipoGanadorId: z.string().uuid().optional(),
  })
  .refine((d) => (d.resolucion === 'walkover' ? Boolean(d.equipoGanadorId) : !d.equipoGanadorId), {
    message:
      'equipoGanadorId es obligatorio para walkover, y no corresponde para las demás resoluciones.',
  });
export type RegistrarNoDisputadoInput = z.infer<typeof esquemaEntrada>;

export interface RegistrarNoDisputadoResultado {
  estado: 'postponed' | 'walkover' | 'cancelled';
  golesLocal: number | null;
  golesVisitante: number | null;
  version: number;
}

interface FilaPartido {
  torneo_id: string;
  grupo_id: string | null;
  equipo_local_id: string;
  equipo_visitante_id: string;
  estado: string;
  goles_local: number | null;
  goles_visitante: number | null;
  goles_walkover_ganador: number;
  goles_walkover_perdedor: number;
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
}

export const registrarNoDisputado: Servicio<
  RegistrarNoDisputadoInput,
  RegistrarNoDisputadoResultado
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<FilaPartido>(
    `SELECT p.torneo_id, p.grupo_id, p.equipo_local_id, p.equipo_visitante_id, p.estado,
            p.goles_local, p.goles_visitante,
            t.goles_walkover_ganador, t.goles_walkover_perdedor,
            t.puntos_victoria, t.puntos_empate, t.puntos_derrota
     FROM partido p JOIN torneo t ON t.id = p.torneo_id
     WHERE p.id = $1`,
    [datos.partidoId],
  );
  const partido = rows[0];
  if (!partido) throw crearError('NO_ENCONTRADO');

  await verificarPermisoTorneo(contexto, partido.torneo_id, 'registrar_no_disputados');

  if (partido.estado === 'played') {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'partidoId',
        problema: 'Un partido ya jugado no se puede registrar como no disputado.',
      },
    ]);
  }

  if (datos.resolucion === 'walkover') {
    if (
      datos.equipoGanadorId !== partido.equipo_local_id &&
      datos.equipoGanadorId !== partido.equipo_visitante_id
    ) {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'equipoGanadorId', problema: 'Tiene que ser uno de los dos equipos del partido.' },
      ]);
    }
  }

  const ganaLocal = datos.equipoGanadorId === partido.equipo_local_id;
  const golesLocal =
    datos.resolucion === 'walkover'
      ? ganaLocal
        ? partido.goles_walkover_ganador
        : partido.goles_walkover_perdedor
      : null;
  const golesVisitante =
    datos.resolucion === 'walkover'
      ? ganaLocal
        ? partido.goles_walkover_perdedor
        : partido.goles_walkover_ganador
      : null;
  const estadoResultado = datos.resolucion === 'walkover' ? 'confirmed' : 'pending';
  const cargadoPorUsuarioId = datos.resolucion === 'walkover' ? contexto.usuarioId : null;
  const fechaCargaResultado = datos.resolucion === 'walkover' ? new Date() : null;

  const cliente = await pool.connect();
  let nuevaVersion: number;
  try {
    await cliente.query('BEGIN');

    const { rows: actualizadas } = await cliente.query<{ version: number }>(
      `UPDATE partido
       SET estado = $2, motivo_no_disputado = $3, goles_local = $4, goles_visitante = $5,
           estado_resultado = $6, cargado_por_usuario_id = $7, fecha_carga_resultado = $8,
           version = version + 1
       WHERE id = $1
       RETURNING version`,
      [
        datos.partidoId,
        datos.resolucion,
        datos.motivo ?? null,
        golesLocal,
        golesVisitante,
        estadoResultado,
        cargadoPorUsuarioId,
        fechaCargaResultado,
      ],
    );
    nuevaVersion = actualizadas[0]!.version;

    if (partido.grupo_id) {
      const puntajes = {
        puntosVictoria: partido.puntos_victoria,
        puntosEmpate: partido.puntos_empate,
        puntosDerrota: partido.puntos_derrota,
      };
      if (datos.resolucion === 'walkover') {
        await aplicarResultadoAPosicion(
          cliente,
          partido.grupo_id,
          partido.equipo_local_id,
          partido.equipo_visitante_id,
          golesLocal!,
          golesVisitante!,
          partido.goles_local,
          partido.goles_visitante,
          puntajes,
        );
      } else if (partido.goles_local !== null && partido.goles_visitante !== null) {
        // Se estaba revirtiendo un walkover previo a postponed/cancelled: deshace su efecto, sin aplicar uno nuevo.
        await revertirEfectoDePosicion(
          cliente,
          partido.grupo_id,
          partido.equipo_local_id,
          partido.equipo_visitante_id,
          partido.goles_local,
          partido.goles_visitante,
          puntajes,
        );
      }
    }

    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }

  invalidarCacheTorneo(partido.torneo_id);
  invalidarCacheEquipo(partido.equipo_local_id);
  invalidarCacheEquipo(partido.equipo_visitante_id);

  return { estado: datos.resolucion, golesLocal, golesVisitante, version: nuevaVersion };
};
