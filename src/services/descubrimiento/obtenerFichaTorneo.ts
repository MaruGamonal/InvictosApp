import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPuedeVerTorneo } from '@/lib/permisos';

/**
 * UC-23 — La ficha pública del torneo (`10`, sección 5): **la superficie
 * más importante del producto**, la que se pega en un chat. Sin sesión,
 * completa, sin ningún pedido de registro (`06`, D-04b) — eso lo
 * garantiza `Servicio` en sí: nunca exige `contexto.usuarioId`.
 *
 * Un torneo `draft` sigue la misma regla de visibilidad que el resto de
 * la plataforma (`verificarPuedeVerTorneo`, T4): solo lo ve quien
 * administra su organización o es su colaborador — para un visitante,
 * `NO_ENCONTRADO`, nunca `SIN_PERMISO` (no hay que confirmarle que
 * existe). Un `unlisted` no tiene esa restricción: se sirve completo por
 * link directo (`06`, D-21b) — lo que le cierra la puerta es el
 * buscador de T22, no esta ficha.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerFichaTorneoInput = z.infer<typeof esquemaEntrada>;

export interface FichaTorneo {
  id: string;
  nombre: string;
  descripcion: string | null;
  modalidad: string;
  categoriaGenero: string;
  categoriaEdad: string;
  ciudad: { id: string; nombre: string };
  estado: string;
  visibilidad: string;
  formato: string;
  cupoEquipos: number;
  equiposAprobados: number;
  fechaInicioEstimada: string | null;
  fechaFinEstimada: string | null;
  imagenUrl: string | null;
  organizacion: { id: string; nombre: string; nivelVerificacion: string };
  tieneReglamento: boolean;
  proximoPartido: {
    id: string;
    equipoLocal: { id: string; nombre: string; escudoUrl: string | null };
    equipoVisitante: { id: string; nombre: string; escudoUrl: string | null };
    fechaHoraProgramada: string | null;
  } | null;
  campeon: { equipoId: string; nombre: string; escudoUrl: string | null } | null;
}

interface FilaTorneo {
  id: string;
  nombre: string;
  descripcion: string | null;
  modalidad: string;
  categoria_genero: string;
  categoria_edad: string;
  ciudad_id: string;
  ciudad_nombre: string;
  estado: string;
  visibilidad: string;
  formato: string;
  cupo_equipos: number;
  fecha_inicio_estimada: Date | null;
  fecha_fin_estimada: Date | null;
  organizacion_id: string;
  organizacion_nombre: string;
  organizacion_logo_url: string | null;
  organizacion_nivel_verificacion: string;
}

async function obtenerProximoPartido(
  pool: ReturnType<typeof obtenerPool>,
  torneoId: string,
): Promise<FichaTorneo['proximoPartido']> {
  const { rows } = await pool.query<{
    id: string;
    fecha_hora_programada: Date | null;
    local_id: string;
    local_nombre: string;
    local_escudo: string | null;
    visitante_id: string;
    visitante_nombre: string;
    visitante_escudo: string | null;
  }>(
    `SELECT p.id, p.fecha_hora_programada,
            el.id AS local_id, el.nombre AS local_nombre, el.escudo_url AS local_escudo,
            ev.id AS visitante_id, ev.nombre AS visitante_nombre, ev.escudo_url AS visitante_escudo
     FROM partido p
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     WHERE p.torneo_id = $1 AND p.estado = 'scheduled'
     ORDER BY p.fecha_hora_programada ASC NULLS LAST
     LIMIT 1`,
    [torneoId],
  );
  const fila = rows[0];
  if (!fila) return null;
  return {
    id: fila.id,
    equipoLocal: { id: fila.local_id, nombre: fila.local_nombre, escudoUrl: fila.local_escudo },
    equipoVisitante: {
      id: fila.visitante_id,
      nombre: fila.visitante_nombre,
      escudoUrl: fila.visitante_escudo,
    },
    fechaHoraProgramada: fila.fecha_hora_programada?.toISOString() ?? null,
  };
}

/**
 * El campeón es la mejor aproximación posible con lo que ya existe: en
 * `knockout`/`groups_knockout` es quien ganó el último partido de la
 * última fase; en `league`, quien lidera la tabla de esa fase. Si algo
 * no cierra —última fase sin terminar, sin partidos, empate en la
 * cima— devuelve `null` en vez de arriesgar un campeón incorrecto: no
 * hay ningún criterio de desempate documentado para este caso puntual.
 */
async function obtenerCampeon(
  pool: ReturnType<typeof obtenerPool>,
  torneoId: string,
): Promise<FichaTorneo['campeon']> {
  const { rows: faseRows } = await pool.query<{ id: string; tipo_fase: 'league' | 'knockout' }>(
    'SELECT id, tipo_fase FROM fase WHERE torneo_id = $1 ORDER BY orden DESC LIMIT 1',
    [torneoId],
  );
  const ultimaFase = faseRows[0];
  if (!ultimaFase) return null;

  async function datosEquipo(equipoId: string): Promise<FichaTorneo['campeon']> {
    const { rows } = await pool.query<{ nombre: string; escudo_url: string | null }>(
      'SELECT nombre, escudo_url FROM equipo WHERE id = $1',
      [equipoId],
    );
    const equipo = rows[0];
    return equipo ? { equipoId, nombre: equipo.nombre, escudoUrl: equipo.escudo_url } : null;
  }

  if (ultimaFase.tipo_fase === 'knockout') {
    const { rows: partidos } = await pool.query<{
      equipo_local_id: string;
      equipo_visitante_id: string;
      goles_local: number | null;
      goles_visitante: number | null;
    }>(
      `SELECT equipo_local_id, equipo_visitante_id, goles_local, goles_visitante
       FROM partido WHERE fase_id = $1 ORDER BY numero_fecha DESC LIMIT 1`,
      [ultimaFase.id],
    );
    const final = partidos[0];
    if (!final || final.goles_local === null || final.goles_visitante === null) return null;
    if (final.goles_local === final.goles_visitante) return null;
    const ganadorId =
      final.goles_local > final.goles_visitante ? final.equipo_local_id : final.equipo_visitante_id;
    return datosEquipo(ganadorId);
  }

  const { rows: lideres } = await pool.query<{
    equipo_id: string;
    puntos: number;
    ajuste_puntos: number;
  }>(
    `SELECT equipo_id, puntos, ajuste_puntos FROM posicion
     WHERE grupo_id IN (SELECT id FROM grupo WHERE fase_id = $1)
     ORDER BY (puntos + ajuste_puntos) DESC, diferencia_gol DESC, goles_favor DESC
     LIMIT 2`,
    [ultimaFase.id],
  );
  const primero = lideres[0];
  const segundo = lideres[1];
  if (!primero) return null;
  if (
    segundo &&
    segundo.puntos + segundo.ajuste_puntos === primero.puntos + primero.ajuste_puntos
  ) {
    return null;
  }
  return datosEquipo(primero.equipo_id);
}

export const obtenerFichaTorneo: Servicio<ObtenerFichaTorneoInput, FichaTorneo> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<FilaTorneo>(
    `SELECT t.id, t.nombre, t.descripcion, t.modalidad, t.categoria_genero, t.categoria_edad,
            c.id AS ciudad_id, c.nombre AS ciudad_nombre,
            t.estado, t.visibilidad, t.formato, t.cupo_equipos,
            t.fecha_inicio_estimada, t.fecha_fin_estimada,
            o.id AS organizacion_id, o.nombre AS organizacion_nombre,
            o.logo_url AS organizacion_logo_url, o.nivel_verificacion AS organizacion_nivel_verificacion
     FROM torneo t
     JOIN ciudad c ON c.id = t.ciudad_id
     JOIN organizacion o ON o.id = t.organizacion_id
     WHERE t.id = $1`,
    [datos.torneoId],
  );
  const torneo = rows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  await verificarPuedeVerTorneo(contexto, {
    id: torneo.id,
    organizacionId: torneo.organizacion_id,
    estado: torneo.estado,
  });

  const { rows: aprobadosRows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM inscripcion WHERE torneo_id = $1 AND estado = 'approved'`,
    [datos.torneoId],
  );
  const { rows: reglamentoRows } = await pool.query(
    `SELECT 1 FROM reglamento WHERE torneo_id = $1 AND estado = 'current'`,
    [datos.torneoId],
  );

  const [proximoPartido, campeon] = await Promise.all([
    torneo.estado === 'in_progress' ? obtenerProximoPartido(pool, datos.torneoId) : null,
    torneo.estado === 'finished' ? obtenerCampeon(pool, datos.torneoId) : null,
  ]);

  return {
    id: torneo.id,
    nombre: torneo.nombre,
    descripcion: torneo.descripcion,
    modalidad: torneo.modalidad,
    categoriaGenero: torneo.categoria_genero,
    categoriaEdad: torneo.categoria_edad,
    ciudad: { id: torneo.ciudad_id, nombre: torneo.ciudad_nombre },
    estado: torneo.estado,
    visibilidad: torneo.visibilidad,
    formato: torneo.formato,
    cupoEquipos: torneo.cupo_equipos,
    equiposAprobados: Number(aprobadosRows[0]!.count),
    fechaInicioEstimada: torneo.fecha_inicio_estimada?.toISOString() ?? null,
    fechaFinEstimada: torneo.fecha_fin_estimada?.toISOString() ?? null,
    imagenUrl: torneo.organizacion_logo_url,
    organizacion: {
      id: torneo.organizacion_id,
      nombre: torneo.organizacion_nombre,
      nivelVerificacion: torneo.organizacion_nivel_verificacion,
    },
    tieneReglamento: reglamentoRows.length > 0,
    proximoPartido,
    campeon,
  };
};
