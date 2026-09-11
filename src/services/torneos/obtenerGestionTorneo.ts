import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * Pantalla de gestión del torneo (`/torneo/[id]/gestionar`): lo que
 * `obtenerFichaTorneo`/`obtenerFixturePublico` no traen porque son de
 * lectura pública — fases ya definidas, inscripciones pendientes de
 * resolver, y los partidos con su `version` (para el optimistic
 * concurrency de `cargarResultado`, T15). Solo para quien administra la
 * organización (Titular/Administrador) — un Colaborador asignado tiene
 * sus tres acciones fijas (`06`, D-32) pero no esta pantalla completa.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerGestionTorneoInput = z.infer<typeof esquemaEntrada>;

export interface FaseGestion {
  id: string;
  nombre: string;
  tipoFase: 'league' | 'knockout';
  orden: number;
  cantidadGrupos: number;
}

export interface InscripcionGestion {
  equipoId: string;
  nombreEquipo: string;
  estado: string;
  advertenciaCategoria: boolean;
  fechaSolicitud: string;
}

export interface PartidoGestion {
  id: string;
  faseId: string;
  numeroFecha: number;
  equipoLocalId: string;
  equipoLocalNombre: string;
  equipoVisitanteId: string;
  equipoVisitanteNombre: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  estado: string;
  version: number;
  fechaHoraProgramada: string | null;
  sedeNombre: string | null;
}

export interface GestionTorneoResultado {
  id: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudadId: string;
  costoInscripcion: number | null;
  costoPlanilla: number | null;
  cupoEquipos: number;
  fechaInicioEstimada: string | null;
  estado: string;
  formato: 'league' | 'knockout' | 'groups_knockout';
  fases: FaseGestion[];
  inscripciones: InscripcionGestion[];
  partidos: PartidoGestion[];
}

export const obtenerGestionTorneo: Servicio<
  ObtenerGestionTorneoInput,
  GestionTorneoResultado
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows: torneoRows } = await pool.query<{
    id: string;
    nombre: string;
    descripcion: string | null;
    direccion: string | null;
    ciudad_id: string;
    costo_inscripcion: string | null;
    costo_planilla: string | null;
    cupo_equipos: number;
    fecha_inicio_estimada: Date | null;
    estado: string;
    formato: 'league' | 'knockout' | 'groups_knockout';
  }>(
    `SELECT id, nombre, descripcion, direccion, ciudad_id, costo_inscripcion, costo_planilla,
            cupo_equipos, fecha_inicio_estimada, estado, formato
     FROM torneo WHERE id = $1`,
    [datos.torneoId],
  );
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');

  const { rows: fases } = await pool.query<{
    id: string;
    nombre: string;
    tipo_fase: 'league' | 'knockout';
    orden: number;
    cantidad_grupos: string;
  }>(
    `SELECT f.id, f.nombre, f.tipo_fase, f.orden, count(g.id) AS cantidad_grupos
     FROM fase f LEFT JOIN grupo g ON g.fase_id = f.id
     WHERE f.torneo_id = $1
     GROUP BY f.id
     ORDER BY f.orden ASC`,
    [datos.torneoId],
  );

  const { rows: inscripciones } = await pool.query<{
    equipo_id: string;
    nombre: string;
    estado: string;
    advertencia_categoria: boolean;
    fecha_solicitud: Date;
  }>(
    `SELECT i.equipo_id, e.nombre, i.estado, i.advertencia_categoria, i.fecha_solicitud
     FROM inscripcion i JOIN equipo e ON e.id = i.equipo_id
     WHERE i.torneo_id = $1
     ORDER BY i.fecha_solicitud ASC`,
    [datos.torneoId],
  );

  const { rows: partidos } = await pool.query<{
    id: string;
    fase_id: string;
    numero_fecha: number;
    equipo_local_id: string;
    equipo_local_nombre: string;
    equipo_visitante_id: string;
    equipo_visitante_nombre: string;
    goles_local: number | null;
    goles_visitante: number | null;
    estado: string;
    version: number;
    fecha_hora_programada: Date | null;
    sede_nombre: string | null;
  }>(
    `SELECT p.id, p.fase_id, p.numero_fecha,
            el.id AS equipo_local_id, el.nombre AS equipo_local_nombre,
            ev.id AS equipo_visitante_id, ev.nombre AS equipo_visitante_nombre,
            p.goles_local, p.goles_visitante, p.estado, p.version,
            p.fecha_hora_programada, s.nombre AS sede_nombre
     FROM partido p
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     LEFT JOIN sede s ON s.id = p.sede_id
     WHERE p.torneo_id = $1
     ORDER BY p.numero_fecha ASC`,
    [datos.torneoId],
  );

  return {
    id: torneo.id,
    nombre: torneo.nombre,
    descripcion: torneo.descripcion,
    direccion: torneo.direccion,
    ciudadId: torneo.ciudad_id,
    costoInscripcion: torneo.costo_inscripcion != null ? Number(torneo.costo_inscripcion) : null,
    costoPlanilla: torneo.costo_planilla != null ? Number(torneo.costo_planilla) : null,
    cupoEquipos: torneo.cupo_equipos,
    fechaInicioEstimada: torneo.fecha_inicio_estimada?.toISOString() ?? null,
    estado: torneo.estado,
    formato: torneo.formato,
    fases: fases.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      tipoFase: fila.tipo_fase,
      orden: fila.orden,
      cantidadGrupos: Number(fila.cantidad_grupos),
    })),
    inscripciones: inscripciones.map((fila) => ({
      equipoId: fila.equipo_id,
      nombreEquipo: fila.nombre,
      estado: fila.estado,
      advertenciaCategoria: fila.advertencia_categoria,
      fechaSolicitud: fila.fecha_solicitud.toISOString(),
    })),
    partidos: partidos.map((fila) => ({
      id: fila.id,
      faseId: fila.fase_id,
      numeroFecha: fila.numero_fecha,
      equipoLocalId: fila.equipo_local_id,
      equipoLocalNombre: fila.equipo_local_nombre,
      equipoVisitanteId: fila.equipo_visitante_id,
      equipoVisitanteNombre: fila.equipo_visitante_nombre,
      golesLocal: fila.goles_local,
      golesVisitante: fila.goles_visitante,
      estado: fila.estado,
      fechaHoraProgramada: fila.fecha_hora_programada?.toISOString() ?? null,
      sedeNombre: fila.sede_nombre,
      version: fila.version,
    })),
  };
};
