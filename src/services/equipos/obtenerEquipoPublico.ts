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
 * (`08`, DIS-08; `06`, S-04): en el MVP no hay ningún cálculo, así que
 * la única respuesta honesta es un estado, no un número.
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
  rolEquipo: 'captain' | 'delegate' | 'player' | 'coach';
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
  /** Nunca un número en el MVP: no hay cálculo de score todavía (`06`, S-04). */
  scoreEstado: 'sin_calcular';
}

interface FilaIntegrante {
  perfil_id: string;
  nombre_visible: string;
  foto_url: string | null;
  posicion: string | null;
  visibilidad: 'public' | 'restricted';
  rol_equipo: 'captain' | 'delegate' | 'player' | 'coach';
}

function aIntegrantePublico(fila: FilaIntegrante): IntegranteEquipoPublico {
  const mostrarCompleto = fila.visibilidad === 'public';
  return {
    perfilId: fila.perfil_id,
    nombreVisible: fila.nombre_visible,
    fotoUrl: mostrarCompleto ? fila.foto_url : null,
    posicion: mostrarCompleto ? fila.posicion : null,
    rolEquipo: fila.rol_equipo,
  };
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
  const plantel = integrantes.filter((i) => i.rol_equipo !== 'coach').map(aIntegrantePublico);
  const cuerpoTecnico = integrantes.filter((i) => i.rol_equipo === 'coach').map(aIntegrantePublico);

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
    scoreEstado: 'sin_calcular',
  };
};
