import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-14/UC-37 — Perfil público del equipo (`10`, sección 5): plantel,
 * cuerpo técnico e historial de torneos con desempeño por torneo y
 * acumulado. Es la otra mitad del historial del que después sale el
 * score (`06`, 5.4) — publicar el historial primero y calcular el
 * score después es el orden que esa decisión fija.
 *
 * **El score se muestra como "sin score todavía", nunca como cero**
 * (`08`, DIS-08; `06`, S-04) para un equipo sin actividad reciente
 * suficiente — `score_equipo.estado` distingue eso de un score real
 * (`recalcularScore.ts`, T26).
 *
 * Cada integrante respeta su propia visibilidad (T18): un perfil
 * `restricted` en este plantel muestra su nombre, nunca su foto,
 * posición o ciudad — la participación en el equipo nunca se oculta,
 * eso es justamente lo que esta pantalla es.
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ObtenerEquipoPublicoInput = z.infer<typeof esquemaEntrada>;

export interface IntegranteEquipoPublico {
  perfilId: string;
  nombreVisible: string;
  fotoUrl: string | null;
  posicion: string | null;
  /**
   * Una persona puede tener más de un vínculo activo en el mismo equipo
   * (p. ej. jugadora y delegada a la vez — `cambiarRolIntegrante.ts`,
   * "quitar delegate no toca sus otros vínculos"): son roles, no
   * personas, así que se agrupan acá en vez de listar a la misma
   * persona una vez por cada uno.
   */
  rolesEquipo: Array<'captain' | 'delegate' | 'player' | 'coach'>;
}

export interface DesempenioTorneo {
  torneoId: string;
  torneoNombre: string;
  torneoEstado: string;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  puntos: number;
  ajustePuntos: number;
}

export interface RivalDePartido {
  torneoId: string;
  torneoNombre: string;
  rivalId: string;
  rivalNombre: string;
  rivalEscudoUrl: string | null;
  esLocal: boolean;
  fechaHoraProgramada: string | null;
}

export interface ProximoPartidoEquipo extends RivalDePartido {
  numeroFecha: number;
  sedeNombre: string | null;
}

export interface UltimoResultadoEquipo extends RivalDePartido {
  estado: 'played' | 'walkover';
  golesPropios: number;
  golesRival: number;
}

export interface DesgloseScore {
  ventanaMeses: number;
  partidosGanados: number;
  partidosEmpatados: number;
  partidosPerdidos: number;
  promedioPuntos: number;
  componenteResultados: number;
  promedioDiferenciaGol: number;
  componenteDiferenciaGol: number;
  torneosDisputados: number;
  componenteTorneos: number;
  bonusPosicionPromedio: number;
  componentePosicion: number;
}

export interface ScoreEquipo {
  valor: number;
  partidosComputados: number;
  desglose: DesgloseScore;
}

export interface EquipoPublico {
  id: string;
  nombre: string;
  escudoUrl: string | null;
  colores: string | null;
  ciudad: { id: string; nombre: string } | null;
  modalidadHabitual: string | null;
  categoriaGenero: string;
  estado: 'active' | 'archived';
  plantel: IntegranteEquipoPublico[];
  cuerpoTecnico: IntegranteEquipoPublico[];
  historial: DesempenioTorneo[];
  acumulado: Omit<DesempenioTorneo, 'torneoId' | 'torneoNombre' | 'torneoEstado'>;
  /**
   * `null` cuando todavía no hay suficiente actividad para un score
   * (`score_equipo.estado` en `insufficient_activity`, `stale`, o sin
   * fila todavía) — nunca un cero (`08`, DIS-08; `06`, S-04): la única
   * respuesta honesta ahí es un estado, no un número.
   */
  score: ScoreEquipo | null;
  proximoPartido: ProximoPartidoEquipo | null;
  ultimoResultado: UltimoResultadoEquipo | null;
}

interface FilaIntegrante {
  perfil_id: string;
  nombre_visible: string;
  foto_url: string | null;
  posicion: string | null;
  visibilidad: 'public' | 'restricted';
  rol_equipo: 'captain' | 'delegate' | 'player' | 'coach';
}

/** Una fila por (perfil, rol) — agrupa por persona antes de mostrarla. */
function agruparPorPersona(filas: FilaIntegrante[]): IntegranteEquipoPublico[] {
  const porPerfil = new Map<string, IntegranteEquipoPublico>();
  for (const fila of filas) {
    const mostrarCompleto = fila.visibilidad === 'public';
    const existente = porPerfil.get(fila.perfil_id);
    if (existente) {
      existente.rolesEquipo.push(fila.rol_equipo);
      continue;
    }
    porPerfil.set(fila.perfil_id, {
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
      fotoUrl: mostrarCompleto ? fila.foto_url : null,
      posicion: mostrarCompleto ? fila.posicion : null,
      rolesEquipo: [fila.rol_equipo],
    });
  }
  return [...porPerfil.values()];
}

export const obtenerEquipoPublico: Servicio<ObtenerEquipoPublicoInput, EquipoPublico> = async (
  input,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<{
    id: string;
    nombre: string;
    escudo_url: string | null;
    colores: string | null;
    ciudad_id: string | null;
    ciudad_nombre: string | null;
    modalidad_habitual: string | null;
    categoria_genero: string;
    estado: 'active' | 'archived';
  }>(
    `SELECT e.id, e.nombre, e.escudo_url, e.colores, c.id AS ciudad_id, c.nombre AS ciudad_nombre,
            e.modalidad_habitual, e.categoria_genero, e.estado
     FROM equipo e
     LEFT JOIN ciudad c ON c.id = e.ciudad_id
     WHERE e.id = $1`,
    [datos.equipoId],
  );
  const equipo = rows[0];
  if (!equipo) throw crearError('NO_ENCONTRADO');

  const { rows: integrantes } = await pool.query<FilaIntegrante>(
    `SELECT ie.perfil_id, pd.nombre_visible, pd.foto_url, pd.posicion, pd.visibilidad, ie.rol_equipo
     FROM integrante_equipo ie
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE ie.equipo_id = $1 AND ie.estado_vinculo = 'active'
     ORDER BY pd.nombre_visible ASC`,
    [datos.equipoId],
  );
  const personas = agruparPorPersona(integrantes);
  // Alguien puede ser jugador y DT a la vez: aparece en las dos listas
  // (son secciones distintas, no la misma), pero una sola vez en cada una.
  const plantel = personas.filter((p) => p.rolesEquipo.some((r) => r !== 'coach'));
  const cuerpoTecnico = personas.filter((p) => p.rolesEquipo.includes('coach'));

  const { rows: historialFilas } = await pool.query<{
    torneo_id: string;
    torneo_nombre: string;
    torneo_estado: string;
    partidos_jugados: string;
    ganados: string;
    empatados: string;
    perdidos: string;
    goles_favor: string;
    goles_contra: string;
    puntos: string;
    ajuste_puntos: string;
  }>(
    `SELECT i.torneo_id, t.nombre AS torneo_nombre, t.estado AS torneo_estado,
            coalesce(sum(p.partidos_jugados), 0) AS partidos_jugados,
            coalesce(sum(p.ganados), 0) AS ganados,
            coalesce(sum(p.empatados), 0) AS empatados,
            coalesce(sum(p.perdidos), 0) AS perdidos,
            coalesce(sum(p.goles_favor), 0) AS goles_favor,
            coalesce(sum(p.goles_contra), 0) AS goles_contra,
            coalesce(sum(p.puntos), 0) AS puntos,
            coalesce(sum(p.ajuste_puntos), 0) AS ajuste_puntos
     FROM inscripcion i
     JOIN torneo t ON t.id = i.torneo_id
     LEFT JOIN posicion p ON p.equipo_id = i.equipo_id
       AND p.grupo_id IN (SELECT g.id FROM grupo g JOIN fase f ON f.id = g.fase_id WHERE f.torneo_id = i.torneo_id)
     WHERE i.equipo_id = $1 AND i.estado = 'approved'
     GROUP BY i.torneo_id, t.nombre, t.estado, t.fecha_inicio_estimada
     ORDER BY t.fecha_inicio_estimada DESC NULLS LAST`,
    [datos.equipoId],
  );

  const historial: DesempenioTorneo[] = historialFilas.map((fila) => ({
    torneoId: fila.torneo_id,
    torneoNombre: fila.torneo_nombre,
    torneoEstado: fila.torneo_estado,
    partidosJugados: Number(fila.partidos_jugados),
    ganados: Number(fila.ganados),
    empatados: Number(fila.empatados),
    perdidos: Number(fila.perdidos),
    golesFavor: Number(fila.goles_favor),
    golesContra: Number(fila.goles_contra),
    puntos: Number(fila.puntos),
    ajustePuntos: Number(fila.ajuste_puntos),
  }));

  const acumulado = historial.reduce(
    (total, fila) => ({
      partidosJugados: total.partidosJugados + fila.partidosJugados,
      ganados: total.ganados + fila.ganados,
      empatados: total.empatados + fila.empatados,
      perdidos: total.perdidos + fila.perdidos,
      golesFavor: total.golesFavor + fila.golesFavor,
      golesContra: total.golesContra + fila.golesContra,
      puntos: total.puntos + fila.puntos,
      ajustePuntos: total.ajustePuntos + fila.ajustePuntos,
    }),
    {
      partidosJugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      golesFavor: 0,
      golesContra: 0,
      puntos: 0,
      ajustePuntos: 0,
    },
  );

  const { rows: scoreRows } = await pool.query<{
    valor: string | null;
    partidos_computados: number;
    estado: 'insufficient_activity' | 'active' | 'stale';
    desglose_componentes: DesgloseScore | null;
  }>(
    `SELECT valor, partidos_computados, estado, desglose_componentes
     FROM score_equipo WHERE equipo_id = $1`,
    [datos.equipoId],
  );
  const filaScore = scoreRows[0];
  const score: ScoreEquipo | null =
    filaScore && filaScore.estado === 'active' && filaScore.valor !== null && filaScore.desglose_componentes
      ? {
          valor: Number(filaScore.valor),
          partidosComputados: filaScore.partidos_computados,
          desglose: filaScore.desglose_componentes,
        }
      : null;

  const { rows: proximoRows } = await pool.query<{
    torneo_id: string;
    torneo_nombre: string;
    numero_fecha: number;
    equipo_local_id: string;
    equipo_local_nombre: string;
    equipo_local_escudo_url: string | null;
    equipo_visitante_id: string;
    equipo_visitante_nombre: string;
    equipo_visitante_escudo_url: string | null;
    fecha_hora_programada: Date | null;
    sede_nombre: string | null;
  }>(
    `SELECT p.torneo_id, t.nombre AS torneo_nombre, p.numero_fecha,
            p.equipo_local_id, el.nombre AS equipo_local_nombre, el.escudo_url AS equipo_local_escudo_url,
            p.equipo_visitante_id, ev.nombre AS equipo_visitante_nombre, ev.escudo_url AS equipo_visitante_escudo_url,
            p.fecha_hora_programada, s.nombre AS sede_nombre
     FROM partido p
     JOIN torneo t ON t.id = p.torneo_id
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     LEFT JOIN sede s ON s.id = p.sede_id
     WHERE (p.equipo_local_id = $1 OR p.equipo_visitante_id = $1) AND p.estado = 'scheduled'
     ORDER BY p.fecha_hora_programada ASC NULLS LAST
     LIMIT 1`,
    [datos.equipoId],
  );
  const filaProximo = proximoRows[0];
  const proximoPartido: ProximoPartidoEquipo | null = filaProximo
    ? {
        torneoId: filaProximo.torneo_id,
        torneoNombre: filaProximo.torneo_nombre,
        numeroFecha: filaProximo.numero_fecha,
        esLocal: filaProximo.equipo_local_id === datos.equipoId,
        rivalId:
          filaProximo.equipo_local_id === datos.equipoId
            ? filaProximo.equipo_visitante_id
            : filaProximo.equipo_local_id,
        rivalNombre:
          filaProximo.equipo_local_id === datos.equipoId
            ? filaProximo.equipo_visitante_nombre
            : filaProximo.equipo_local_nombre,
        rivalEscudoUrl:
          filaProximo.equipo_local_id === datos.equipoId
            ? filaProximo.equipo_visitante_escudo_url
            : filaProximo.equipo_local_escudo_url,
        fechaHoraProgramada: filaProximo.fecha_hora_programada?.toISOString() ?? null,
        sedeNombre: filaProximo.sede_nombre,
      }
    : null;

  const { rows: ultimoRows } = await pool.query<{
    torneo_id: string;
    torneo_nombre: string;
    equipo_local_id: string;
    equipo_local_nombre: string;
    equipo_local_escudo_url: string | null;
    equipo_visitante_id: string;
    equipo_visitante_nombre: string;
    equipo_visitante_escudo_url: string | null;
    fecha_hora_programada: Date | null;
    estado: 'played' | 'walkover';
    goles_local: number;
    goles_visitante: number;
  }>(
    `SELECT p.torneo_id, t.nombre AS torneo_nombre,
            p.equipo_local_id, el.nombre AS equipo_local_nombre, el.escudo_url AS equipo_local_escudo_url,
            p.equipo_visitante_id, ev.nombre AS equipo_visitante_nombre, ev.escudo_url AS equipo_visitante_escudo_url,
            p.fecha_hora_programada, p.estado, p.goles_local, p.goles_visitante
     FROM partido p
     JOIN torneo t ON t.id = p.torneo_id
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     WHERE (p.equipo_local_id = $1 OR p.equipo_visitante_id = $1) AND p.estado IN ('played', 'walkover')
     ORDER BY p.fecha_hora_programada DESC NULLS LAST
     LIMIT 1`,
    [datos.equipoId],
  );
  const filaUltimo = ultimoRows[0];
  const ultimoResultado: UltimoResultadoEquipo | null = filaUltimo
    ? {
        torneoId: filaUltimo.torneo_id,
        torneoNombre: filaUltimo.torneo_nombre,
        estado: filaUltimo.estado,
        esLocal: filaUltimo.equipo_local_id === datos.equipoId,
        rivalId:
          filaUltimo.equipo_local_id === datos.equipoId
            ? filaUltimo.equipo_visitante_id
            : filaUltimo.equipo_local_id,
        rivalNombre:
          filaUltimo.equipo_local_id === datos.equipoId
            ? filaUltimo.equipo_visitante_nombre
            : filaUltimo.equipo_local_nombre,
        rivalEscudoUrl:
          filaUltimo.equipo_local_id === datos.equipoId
            ? filaUltimo.equipo_visitante_escudo_url
            : filaUltimo.equipo_local_escudo_url,
        fechaHoraProgramada: filaUltimo.fecha_hora_programada?.toISOString() ?? null,
        golesPropios:
          filaUltimo.equipo_local_id === datos.equipoId
            ? Number(filaUltimo.goles_local)
            : Number(filaUltimo.goles_visitante),
        golesRival:
          filaUltimo.equipo_local_id === datos.equipoId
            ? Number(filaUltimo.goles_visitante)
            : Number(filaUltimo.goles_local),
      }
    : null;

  return {
    id: equipo.id,
    nombre: equipo.nombre,
    escudoUrl: equipo.escudo_url,
    colores: equipo.colores,
    ciudad: equipo.ciudad_id ? { id: equipo.ciudad_id, nombre: equipo.ciudad_nombre! } : null,
    modalidadHabitual: equipo.modalidad_habitual,
    categoriaGenero: equipo.categoria_genero,
    estado: equipo.estado,
    plantel,
    cuerpoTecnico,
    historial,
    acumulado,
    score,
    proximoPartido,
    ultimoResultado,
  };
};
