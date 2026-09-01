import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPuedeVerTorneo } from '@/lib/permisos';

/**
 * UC-23 — El fixture público del torneo (`10`, sección 5): mismo
 * criterio de visibilidad que `obtenerFichaTorneo` (draft solo para
 * quien administra la organización o es su colaborador; unlisted, por
 * link directo).
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerFixturePublicoInput = z.infer<typeof esquemaEntrada>;

export interface PartidoFixturePublico {
  id: string;
  numeroFecha: number;
  faseId: string;
  faseNombre: string;
  grupoNombre: string | null;
  estado: string;
  equipoLocal: { id: string; nombre: string; escudoUrl: string | null };
  equipoVisitante: { id: string; nombre: string; escudoUrl: string | null };
  golesLocal: number | null;
  golesVisitante: number | null;
  fechaHoraProgramada: string | null;
  fechaHoraOriginal: string | null;
  sedeNombre: string | null;
}

export interface FechaVigente {
  faseId: string;
  numeroFecha: number;
}

export interface FixturePublico {
  /**
   * La fecha que conviene mostrar primero: la próxima sin resolver, o la
   * última si el torneo ya terminó. Lleva `faseId` porque `numero_fecha`
   * arranca de nuevo en cada fase (`groups_knockout`: la llave de
   * eliminación directa vuelve a empezar en 1) — un número solo no
   * identifica una fecha sin ambigüedad.
   */
  fechaVigente: FechaVigente | null;
  partidos: PartidoFixturePublico[];
}

const ESTADOS_SIN_RESOLVER = ['unscheduled', 'scheduled', 'postponed'];

export const obtenerFixturePublico: Servicio<ObtenerFixturePublicoInput, FixturePublico> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows: torneoRows } = await pool.query<{
    id: string;
    organizacion_id: string;
    estado: string;
  }>('SELECT id, organizacion_id, estado FROM torneo WHERE id = $1', [datos.torneoId]);
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  await verificarPuedeVerTorneo(contexto, {
    id: torneo.id,
    organizacionId: torneo.organizacion_id,
    estado: torneo.estado,
  });

  const { rows } = await pool.query<{
    id: string;
    numero_fecha: number;
    fase_id: string;
    fase_nombre: string;
    grupo_nombre: string | null;
    estado: string;
    local_id: string;
    local_nombre: string;
    local_escudo: string | null;
    visitante_id: string;
    visitante_nombre: string;
    visitante_escudo: string | null;
    goles_local: number | null;
    goles_visitante: number | null;
    fecha_hora_programada: Date | null;
    fecha_hora_original: Date | null;
    sede_nombre: string | null;
  }>(
    `SELECT p.id, p.numero_fecha, f.id AS fase_id, f.nombre AS fase_nombre, g.nombre AS grupo_nombre, p.estado,
            el.id AS local_id, el.nombre AS local_nombre, el.escudo_url AS local_escudo,
            ev.id AS visitante_id, ev.nombre AS visitante_nombre, ev.escudo_url AS visitante_escudo,
            p.goles_local, p.goles_visitante, p.fecha_hora_programada, p.fecha_hora_original,
            s.nombre AS sede_nombre
     FROM partido p
     JOIN fase f ON f.id = p.fase_id
     LEFT JOIN grupo g ON g.id = p.grupo_id
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     LEFT JOIN sede s ON s.id = p.sede_id
     WHERE p.torneo_id = $1
     ORDER BY f.orden ASC, p.numero_fecha ASC`,
    [datos.torneoId],
  );

  const partidos: PartidoFixturePublico[] = rows.map((fila) => ({
    id: fila.id,
    numeroFecha: fila.numero_fecha,
    faseId: fila.fase_id,
    faseNombre: fila.fase_nombre,
    grupoNombre: fila.grupo_nombre,
    estado: fila.estado,
    equipoLocal: { id: fila.local_id, nombre: fila.local_nombre, escudoUrl: fila.local_escudo },
    equipoVisitante: {
      id: fila.visitante_id,
      nombre: fila.visitante_nombre,
      escudoUrl: fila.visitante_escudo,
    },
    golesLocal: fila.goles_local,
    golesVisitante: fila.goles_visitante,
    fechaHoraProgramada: fila.fecha_hora_programada?.toISOString() ?? null,
    fechaHoraOriginal: fila.fecha_hora_original?.toISOString() ?? null,
    sedeNombre: fila.sede_nombre,
  }));

  // `partidos` ya viene ordenado por fase (f.orden) y luego numero_fecha:
  // el primer pendiente en ese orden es la fecha vigente, no la de menor
  // numero_fecha sin más — ese número vuelve a empezar en cada fase.
  const pendientes = partidos.filter((p) => ESTADOS_SIN_RESOLVER.includes(p.estado));
  const partidoDeReferencia = pendientes[0] ?? partidos.at(-1) ?? null;
  const fechaVigente: FechaVigente | null = partidoDeReferencia
    ? { faseId: partidoDeReferencia.faseId, numeroFecha: partidoDeReferencia.numeroFecha }
    : null;

  return { fechaVigente, partidos };
};
