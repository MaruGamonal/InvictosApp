import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { obtenerRolEnOrganizacion, verificarPermisoTorneo } from '@/lib/permisos';

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
  advertenciaMultiplesDivisiones: boolean;
  fechaSolicitud: string;
  /**
   * UC-35 — Si el equipo ya tiene una fila de tabla asignada
   * (`confirmarFixture` le puso grupo). Antes de eso no hay nada que
   * sancionar: el ajuste no tendría dónde guardarse.
   */
  tieneTabla: boolean;
  /** Quita o bonificación acumulada (`06`, D-35b). 0 es lo normal. */
  ajustePuntos: number;
  /** El motivo del último ajuste, para que una sanción no sea un número sin explicación. */
  ultimoAjusteMotivo: string | null;
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
  estadoResultado: 'pending' | 'loaded' | 'confirmed' | 'disputed';
  /** El motivo de la objeción abierta, si la hay. Es lo que el organizador tiene que leer. */
  objecionMotivo: string | null;
}

/** UC-34 — Alguien de la lista de buena fe al que se le puede acreditar un gol o una tarjeta. */
export interface IntegranteElegible {
  perfilId: string;
  nombreVisible: string;
  rolEnTorneo: 'player' | 'coach';
}

/** Otra división (torneo) del mismo certamen (`06`, D-103) — para elegirla al agregar una división o al rechazar por `wrong_division`. */
export interface DivisionDelCertamen {
  id: string;
  division: string;
  estado: string;
}

/** `06`, D-07b / D-08b / D-26 / D-30b / D-33b — lo que decide cómo se juega y cómo se cuenta. */
export interface ReglasDelTorneo {
  /**
   * `null` es lo normal: las columnas son nullable y sin valor por
   * defecto, así que un torneo recién creado no tiene tope de plantel
   * hasta que alguien se lo ponga. Tipearlas como `number` fue un error
   * que el test de integración agarró — contra la base simulada habrían
   * pasado por números para siempre.
   */
  minJugadoresLista: number | null;
  maxJugadoresLista: number | null;
  puntosVictoria: number;
  puntosEmpate: number;
  puntosDerrota: number;
  /** D-26 — nadie puede estar en la lista de buena fe de dos equipos del mismo torneo. */
  jugadorUnicoPorEquipo: boolean;
  /** D-07b — con esto puesto, el capitán no carga resultados: sólo la organización. */
  soloOrganizadorCargaResultados: boolean;
  /** D-08b — qué pasa con los partidos que le quedaban a un equipo que abandona. */
  partidosPendientesPorAbandono: 'ganados_por_rival' | 'anulados';
  /** D-33b — el marcador con el que se registra un partido ganado por presentación. */
  golesWalkoverGanador: number;
  golesWalkoverPerdedor: number;
  /** D-30b — después de esta fecha no se suma nadie más a ninguna lista de buena fe. */
  fechaCierreListaBuenaFe: string | null;
}

export interface GestionTorneoResultado {
  id: string;
  organizacionId: string;
  /** UC-07 — con qué rol de organización mira esta pantalla quien la abre; determina si puede gestionar Administradores. */
  miRolEnOrganizacion: 'owner' | 'admin' | null;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  direccion: string | null;
  ciudadId: string;
  costoInscripcion: number | null;
  costoPlanilla: number | null;
  cupoEquipos: number;
  fechaInicioEstimada: string | null;
  fechaFinEstimada: string | null;
  estado: string;
  formato: 'league' | 'knockout' | 'groups_knockout';
  /** `06`, D-103 — null en el caso normal (torneo suelto, sin categorías competitivas). */
  certamenId: string | null;
  division: string | null;
  /** Las demás divisiones del mismo certamen, sin incluir esta — `[]` si no pertenece a ninguno. */
  divisionesDelCertamen: DivisionDelCertamen[];
  /**
   * Las reglas de competencia del torneo (migración
   * `parametros-configurables-de-torneo`). Viajaban por `crearTorneo` y
   * `actualizarTorneo` desde el principio y ninguna pantalla las leía ni
   * las escribía: sólo se podían tocar pegándole a la API.
   */
  reglas: ReglasDelTorneo;
  fases: FaseGestion[];
  inscripciones: InscripcionGestion[];
  partidos: PartidoGestion[];
  /** Habilitados de cada equipo inscripto, para atribuir goles y tarjetas al cargar un resultado (UC-34). */
  elegiblesPorEquipo: Record<string, IntegranteElegible[]>;
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
    imagen_url: string | null;
    direccion: string | null;
    ciudad_id: string;
    costo_inscripcion: string | null;
    costo_planilla: string | null;
    cupo_equipos: number;
    fecha_inicio_estimada: Date | null;
    fecha_fin_estimada: Date | null;
    estado: string;
    formato: 'league' | 'knockout' | 'groups_knockout';
    organizacion_id: string;
    certamen_id: string | null;
    division: string | null;
    min_jugadores_lista: number | null;
    max_jugadores_lista: number | null;
    puntos_victoria: number;
    puntos_empate: number;
    puntos_derrota: number;
    jugador_unico_por_equipo: boolean;
    solo_organizador_carga_resultados: boolean;
    partidos_pendientes_por_abandono: 'ganados_por_rival' | 'anulados';
    goles_walkover_ganador: number;
    goles_walkover_perdedor: number;
    fecha_cierre_lista_buena_fe: Date | null;
  }>(
    `SELECT id, nombre, descripcion, imagen_url, direccion, ciudad_id, costo_inscripcion, costo_planilla,
            cupo_equipos, fecha_inicio_estimada, fecha_fin_estimada, estado, formato, organizacion_id,
            certamen_id, division,
            min_jugadores_lista, max_jugadores_lista,
            puntos_victoria, puntos_empate, puntos_derrota,
            jugador_unico_por_equipo, solo_organizador_carga_resultados,
            partidos_pendientes_por_abandono, goles_walkover_ganador, goles_walkover_perdedor,
            fecha_cierre_lista_buena_fe
     FROM torneo WHERE id = $1`,
    [datos.torneoId],
  );
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');

  // Titular o Administrador: `verificarPermisoTorneo` de arriba ya descartó a
  // cualquier otro caso (`06`, D-64) — salvo `esSistema`, sin usuario real.
  const miRolEnOrganizacion = contexto.usuarioId
    ? await obtenerRolEnOrganizacion(contexto.usuarioId, torneo.organizacion_id)
    : null;

  let divisionesDelCertamen: DivisionDelCertamen[] = [];
  if (torneo.certamen_id) {
    const { rows: divisiones } = await pool.query<{
      id: string;
      division: string;
      estado: string;
    }>(`SELECT id, division, estado FROM torneo WHERE certamen_id = $1 AND id != $2`, [
      torneo.certamen_id,
      torneo.id,
    ]);
    divisionesDelCertamen = divisiones;
  }

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
    advertencia_multiples_divisiones: boolean;
    fecha_solicitud: Date;
    tiene_tabla: boolean;
    ajuste_puntos: number | null;
    ultimo_ajuste_motivo: string | null;
  }>(
    // El ajuste de puntos viene de `posicion`, por el grupo que le
    // asignó `confirmarFixture`: sin grupo todavía no hay tabla que
    // ajustar, y por eso `tiene_tabla` viaja aparte de que el ajuste
    // sea 0 — "no se puede sancionar todavía" y "no tiene sanciones"
    // son dos cosas distintas.
    `SELECT i.equipo_id, e.nombre, i.estado, i.advertencia_categoria,
            i.advertencia_multiples_divisiones, i.fecha_solicitud,
            (i.grupo_id IS NOT NULL) AS tiene_tabla,
            p.ajuste_puntos, p.ultimo_ajuste_motivo
     FROM inscripcion i
     JOIN equipo e ON e.id = i.equipo_id
     LEFT JOIN posicion p ON p.grupo_id = i.grupo_id AND p.equipo_id = i.equipo_id
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
    estado_resultado: 'pending' | 'loaded' | 'confirmed' | 'disputed';
    objecion_motivo: string | null;
  }>(
    `SELECT p.id, p.fase_id, p.numero_fecha,
            el.id AS equipo_local_id, el.nombre AS equipo_local_nombre,
            ev.id AS equipo_visitante_id, ev.nombre AS equipo_visitante_nombre,
            p.goles_local, p.goles_visitante, p.estado, p.version,
            p.fecha_hora_programada, s.nombre AS sede_nombre,
            p.estado_resultado, d.motivo AS objecion_motivo
     FROM partido p
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     LEFT JOIN sede s ON s.id = p.sede_id
     LEFT JOIN disputa_resultado d ON d.partido_id = p.id AND d.estado = 'open'
     WHERE p.torneo_id = $1
     ORDER BY p.numero_fecha ASC`,
    [datos.torneoId],
  );

  const { rows: elegibles } = await pool.query<{
    equipo_id: string;
    perfil_id: string;
    nombre_visible: string;
    rol_en_torneo: 'player' | 'coach';
  }>(
    `SELECT ih.equipo_id, ih.perfil_id, pd.nombre_visible, ih.rol_en_torneo
     FROM integrante_habilitado ih
     JOIN perfil_deportivo pd ON pd.id = ih.perfil_id
     WHERE ih.torneo_id = $1 AND ih.estado = 'eligible' AND ih.rol_en_torneo IN ('player', 'coach')
     ORDER BY pd.nombre_visible ASC`,
    [datos.torneoId],
  );
  const elegiblesPorEquipo: Record<string, IntegranteElegible[]> = {};
  for (const fila of elegibles) {
    (elegiblesPorEquipo[fila.equipo_id] ??= []).push({
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
      rolEnTorneo: fila.rol_en_torneo,
    });
  }

  return {
    id: torneo.id,
    organizacionId: torneo.organizacion_id,
    miRolEnOrganizacion,
    nombre: torneo.nombre,
    descripcion: torneo.descripcion,
    imagenUrl: torneo.imagen_url,
    direccion: torneo.direccion,
    ciudadId: torneo.ciudad_id,
    costoInscripcion: torneo.costo_inscripcion != null ? Number(torneo.costo_inscripcion) : null,
    costoPlanilla: torneo.costo_planilla != null ? Number(torneo.costo_planilla) : null,
    cupoEquipos: torneo.cupo_equipos,
    fechaInicioEstimada: torneo.fecha_inicio_estimada?.toISOString() ?? null,
    fechaFinEstimada: torneo.fecha_fin_estimada?.toISOString() ?? null,
    estado: torneo.estado,
    formato: torneo.formato,
    certamenId: torneo.certamen_id,
    division: torneo.division,
    divisionesDelCertamen,
    reglas: {
      minJugadoresLista: torneo.min_jugadores_lista,
      maxJugadoresLista: torneo.max_jugadores_lista,
      puntosVictoria: torneo.puntos_victoria,
      puntosEmpate: torneo.puntos_empate,
      puntosDerrota: torneo.puntos_derrota,
      jugadorUnicoPorEquipo: torneo.jugador_unico_por_equipo,
      soloOrganizadorCargaResultados: torneo.solo_organizador_carga_resultados,
      partidosPendientesPorAbandono: torneo.partidos_pendientes_por_abandono,
      golesWalkoverGanador: torneo.goles_walkover_ganador,
      golesWalkoverPerdedor: torneo.goles_walkover_perdedor,
      fechaCierreListaBuenaFe: torneo.fecha_cierre_lista_buena_fe?.toISOString() ?? null,
    },
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
      advertenciaMultiplesDivisiones: fila.advertencia_multiples_divisiones,
      fechaSolicitud: fila.fecha_solicitud.toISOString(),
      tieneTabla: fila.tiene_tabla,
      ajustePuntos: fila.ajuste_puntos ?? 0,
      ultimoAjusteMotivo: fila.ultimo_ajuste_motivo,
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
      estadoResultado: fila.estado_resultado,
      objecionMotivo: fila.objecion_motivo,
    })),
    elegiblesPorEquipo,
  };
};
