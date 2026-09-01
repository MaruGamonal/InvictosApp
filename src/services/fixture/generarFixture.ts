import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { generarRoundRobin, type PartidoPropuesto } from './_roundRobin';
import { generarPrimeraRondaBracket, generarSiguienteRondaBracket } from './_bracket';

/**
 * UC-29 — Generar la propuesta de fixture de una fase, **sin
 * persistir** (`06`, D-31b): el organizador la edita antes de
 * confirmar (`confirmarFixture`). El sorteo no admite criterios —el
 * orden de entrada de los equipos es el único insumo—, porque la
 * edición manual cubre cualquier restricción real con menos
 * complejidad que intentar modelarla.
 *
 * Liga: todos contra todos por el método del círculo, con fecha libre
 * si la cantidad es impar. Grupos + eliminatoria: la primera fase
 * reparte los equipos en las zonas ya creadas (`definirFormato`, T9) y
 * arma una liga dentro de cada una; la fase eliminatoria arma la
 * primera ronda con los clasificados de la fase anterior (ya
 * terminada) o, ronda a ronda, con los ganadores de la ronda previa —
 * el rival de la siguiente ronda no existe hasta que la anterior se
 * jugó.
 */

const esquemaEntrada = z.object({ faseId: z.string().uuid() });
export type GenerarFixtureInput = z.infer<typeof esquemaEntrada>;

export interface PartidoPropuestoConGrupo extends PartidoPropuesto {
  grupoId: string | null;
}
export interface AsignacionGrupoPropuesta {
  equipoId: string;
  grupoId: string;
}
export interface FixturePropuesto {
  faseId: string;
  partidos: PartidoPropuestoConGrupo[];
  asignacionesGrupo: AsignacionGrupoPropuesta[];
  partidosJugadosQueSePerderian: number;
}

interface FilaFase {
  id: string;
  torneo_id: string;
  tipo_fase: 'league' | 'knockout';
  orden: number;
  ida_y_vuelta: boolean;
  clasifican_por_grupo: number | null;
}

async function obtenerEquiposAprobados(pool: ReturnType<typeof obtenerPool>, torneoId: string) {
  const { rows } = await pool.query<{ equipo_id: string }>(
    `SELECT equipo_id FROM inscripcion WHERE torneo_id = $1 AND estado = 'approved' ORDER BY fecha_solicitud ASC`,
    [torneoId],
  );
  return rows.map((r) => r.equipo_id);
}

function determinarGanador(partido: {
  equipo_local_id: string;
  equipo_visitante_id: string;
  goles_local: number | null;
  goles_visitante: number | null;
}): string {
  if (partido.goles_local === null || partido.goles_visitante === null) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'partido', problema: 'Hay un partido de la ronda anterior sin resultado cargado.' },
    ]);
  }
  if (partido.goles_local === partido.goles_visitante) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'partido',
        problema: 'Un partido de eliminación directa terminó empatado y no tiene ganador definido.',
      },
    ]);
  }
  return partido.goles_local > partido.goles_visitante
    ? partido.equipo_local_id
    : partido.equipo_visitante_id;
}

export const generarFixture: Servicio<GenerarFixtureInput, FixturePropuesto> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: faseRows } = await pool.query<FilaFase>(
    'SELECT id, torneo_id, tipo_fase, orden, ida_y_vuelta, clasifican_por_grupo FROM fase WHERE id = $1',
    [datos.faseId],
  );
  const fase = faseRows[0];
  if (!fase) throw crearError('NO_ENCONTRADO');
  await verificarPermisoTorneo(contexto, fase.torneo_id, 'configurar_torneo');

  const { rows: torneoRows } = await pool.query<{ estado: string }>(
    'SELECT estado FROM torneo WHERE id = $1',
    [fase.torneo_id],
  );
  if (torneoRows[0]!.estado === 'registration_open') throw crearError('INSCRIPCIONES_ABIERTAS');

  const { rows: jugadosRows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM partido WHERE fase_id = $1 AND estado = 'played'`,
    [datos.faseId],
  );
  const partidosJugadosQueSePerderian = Number(jugadosRows[0]!.count);

  if (fase.tipo_fase === 'league') {
    const { rows: grupos } = await pool.query<{ id: string; nombre: string }>(
      'SELECT id, nombre FROM grupo WHERE fase_id = $1 ORDER BY nombre ASC',
      [datos.faseId],
    );
    if (grupos.length === 0) throw crearError('NO_ENCONTRADO');

    const equipoIds = await obtenerEquiposAprobados(pool, fase.torneo_id);
    const partidos: PartidoPropuestoConGrupo[] = [];
    const asignacionesGrupo: AsignacionGrupoPropuesta[] = [];

    if (grupos.length === 1) {
      const grupoId = grupos[0]!.id;
      for (const equipoId of equipoIds) asignacionesGrupo.push({ equipoId, grupoId });
      for (const p of generarRoundRobin(equipoIds, fase.ida_y_vuelta)) {
        partidos.push({ ...p, grupoId });
      }
    } else {
      const equiposPorGrupo = new Map<string, string[]>(grupos.map((g) => [g.id, []]));
      equipoIds.forEach((equipoId, i) => {
        const grupo = grupos[i % grupos.length]!;
        equiposPorGrupo.get(grupo.id)!.push(equipoId);
        asignacionesGrupo.push({ equipoId, grupoId: grupo.id });
      });
      for (const [grupoId, equiposDeLaZona] of equiposPorGrupo) {
        for (const p of generarRoundRobin(equiposDeLaZona, fase.ida_y_vuelta)) {
          partidos.push({ ...p, grupoId });
        }
      }
    }

    return { faseId: datos.faseId, partidos, asignacionesGrupo, partidosJugadosQueSePerderian };
  }

  // tipo_fase === 'knockout'
  const { rows: existentes } = await pool.query<{
    numero_fecha: number;
    equipo_local_id: string;
    equipo_visitante_id: string;
    goles_local: number | null;
    goles_visitante: number | null;
    estado: string;
  }>(
    'SELECT numero_fecha, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, estado FROM partido WHERE fase_id = $1 ORDER BY numero_fecha ASC',
    [datos.faseId],
  );

  if (existentes.length === 0) {
    let equiposSemilla: string[];
    if (fase.orden === 1) {
      equiposSemilla = await obtenerEquiposAprobados(pool, fase.torneo_id);
    } else {
      const { rows: faseAnteriorRows } = await pool.query<{ id: string }>(
        'SELECT id FROM fase WHERE torneo_id = $1 AND orden = $2',
        [fase.torneo_id, fase.orden - 1],
      );
      const faseAnterior = faseAnteriorRows[0];
      if (!faseAnterior) throw crearError('NO_ENCONTRADO');

      const { rows: sinTerminar } = await pool.query(
        `SELECT 1 FROM partido WHERE fase_id = $1 AND estado NOT IN ('played', 'walkover', 'cancelled') LIMIT 1`,
        [faseAnterior.id],
      );
      if (sinTerminar.length > 0) {
        throw crearError('DATOS_INVALIDOS', [
          { campo: 'faseId', problema: 'La fase de grupos todavía no terminó.' },
        ]);
      }

      const { rows: gruposAnteriores } = await pool.query<{ id: string }>(
        'SELECT id FROM grupo WHERE fase_id = $1 ORDER BY nombre ASC',
        [faseAnterior.id],
      );
      equiposSemilla = [];
      for (const grupo of gruposAnteriores) {
        const { rows: clasificados } = await pool.query<{ equipo_id: string }>(
          `SELECT equipo_id FROM posicion WHERE grupo_id = $1
           ORDER BY posicion_actual ASC NULLS LAST, (puntos + ajuste_puntos) DESC, diferencia_gol DESC, goles_favor DESC
           LIMIT $2`,
          [grupo.id, fase.clasifican_por_grupo ?? 1],
        );
        equiposSemilla.push(...clasificados.map((c) => c.equipo_id));
      }
    }

    return {
      faseId: datos.faseId,
      partidos: generarPrimeraRondaBracket(equiposSemilla).map((p) => ({ ...p, grupoId: null })),
      asignacionesGrupo: [],
      partidosJugadosQueSePerderian,
    };
  }

  const ultimaRonda = existentes[existentes.length - 1]!.numero_fecha;
  const partidosUltimaRonda = existentes.filter((p) => p.numero_fecha === ultimaRonda);
  if (partidosUltimaRonda.some((p) => p.estado !== 'played' && p.estado !== 'walkover')) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'faseId', problema: 'Todavía hay partidos de la ronda anterior sin definir.' },
    ]);
  }
  if (partidosUltimaRonda.length === 1) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'faseId', problema: 'La eliminatoria ya tiene un campeón definido.' },
    ]);
  }

  const ganadores = partidosUltimaRonda.map(determinarGanador);
  return {
    faseId: datos.faseId,
    partidos: generarSiguienteRondaBracket(ganadores, ultimaRonda + 1).map((p) => ({
      ...p,
      grupoId: null,
    })),
    asignacionesGrupo: [],
    partidosJugadosQueSePerderian,
  };
};
