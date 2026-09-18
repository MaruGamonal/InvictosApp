import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';

/**
 * Home del panel de Organizador (`/organizador/gestionar`): un
 * tablero de "qué necesita mi atención hoy", distinto de
 * `obtenerInicio.ts` (que trae como mucho 5 torneos para un feed, no
 * pensado para gestionar). Reutiliza las mismas señales de atención ya
 * mostradas como avisos en Inicio (inscripciones pendientes,
 * resultados sin cargar) en vez de inventar criterios nuevos.
 *
 * Los `cancelled` se excluyen de todo el panel — no hay nada que
 * gestionar en un torneo cancelado, igual criterio que el resto de la
 * app. El resto (incluido `suspended`) cae en "Próximos" salvo
 * `in_progress` (Activos) y `finished` (Finalizados).
 */

const esquemaEntrada = z.object({ organizacionId: z.string().uuid() });
export type ObtenerPanelOrganizadorInput = z.infer<typeof esquemaEntrada>;

export interface TorneoPanelOrganizador {
  id: string;
  nombre: string;
  modalidad: string;
  categoriaGenero: string;
  imagenUrl: string | null;
  estado: string;
  cupoEquipos: number;
  inscriptos: number;
  fechaInicioEstimada: string | null;
  fechaFinEstimada: string | null;
  inscripcionesPendientes: number;
  resultadosSinCargar: number;
  progreso: { fechaActual: number; fechaTotal: number } | null;
  proximoPartido: {
    equipoLocalNombre: string;
    equipoVisitanteNombre: string;
    fechaHoraProgramada: string | null;
  } | null;
  ultimoResultado: {
    equipoLocalNombre: string;
    equipoVisitanteNombre: string;
    golesLocal: number;
    golesVisitante: number;
  } | null;
}

export interface PanelOrganizadorResultado {
  organizacionId: string;
  nombreOrganizacion: string;
  stats: { activos: number; porComenzar: number; finalizados: number };
  necesitanAtencion: TorneoPanelOrganizador[];
  activos: TorneoPanelOrganizador[];
  proximos: TorneoPanelOrganizador[];
  finalizados: TorneoPanelOrganizador[];
}

export const obtenerPanelOrganizador: Servicio<
  ObtenerPanelOrganizadorInput,
  PanelOrganizadorResultado
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'gestionar_torneos');

  const pool = obtenerPool();

  const { rows: organizacionRows } = await pool.query<{ nombre: string; logo_url: string | null }>(
    'SELECT nombre, logo_url FROM organizacion WHERE id = $1',
    [datos.organizacionId],
  );
  const nombreOrganizacion = organizacionRows[0]?.nombre ?? '';
  const logoOrganizacion = organizacionRows[0]?.logo_url ?? null;

  const { rows: torneos } = await pool.query<{
    id: string;
    nombre: string;
    modalidad: string;
    categoria_genero: string;
    imagen_url: string | null;
    estado: string;
    cupo_equipos: number;
    fecha_inicio_estimada: Date | null;
    fecha_fin_estimada: Date | null;
    inscriptos: string;
  }>(
    `SELECT t.id, t.nombre, t.modalidad, t.categoria_genero, t.imagen_url, t.estado, t.cupo_equipos,
            t.fecha_inicio_estimada, t.fecha_fin_estimada,
            (SELECT count(*) FROM inscripcion i WHERE i.torneo_id = t.id AND i.estado = 'approved') AS inscriptos
     FROM torneo t
     WHERE t.organizacion_id = $1 AND t.estado != 'cancelled'
     ORDER BY t.fecha_inicio_estimada ASC NULLS LAST`,
    [datos.organizacionId],
  );

  const idsTorneos = torneos.map((t) => t.id);
  if (idsTorneos.length === 0) {
    return {
      organizacionId: datos.organizacionId,
      nombreOrganizacion,
      stats: { activos: 0, porComenzar: 0, finalizados: 0 },
      necesitanAtencion: [],
      activos: [],
      proximos: [],
      finalizados: [],
    };
  }

  const { rows: inscripcionesPendRows } = await pool.query<{ torneo_id: string; cantidad: string }>(
    `SELECT torneo_id, count(*) AS cantidad FROM inscripcion
     WHERE torneo_id = ANY($1) AND estado = 'pending'
     GROUP BY torneo_id`,
    [idsTorneos],
  );
  const inscripcionesPendPorTorneo = new Map(
    inscripcionesPendRows.map((f) => [f.torneo_id, Number(f.cantidad)]),
  );

  const { rows: resultadosSinCargarRows } = await pool.query<{
    torneo_id: string;
    cantidad: string;
  }>(
    `SELECT torneo_id, count(*) AS cantidad FROM partido
     WHERE torneo_id = ANY($1) AND estado = 'scheduled'
       AND fecha_hora_programada < now() AND estado_resultado = 'pending'
     GROUP BY torneo_id`,
    [idsTorneos],
  );
  const resultadosSinCargarPorTorneo = new Map(
    resultadosSinCargarRows.map((f) => [f.torneo_id, Number(f.cantidad)]),
  );

  const { rows: progresoRows } = await pool.query<{
    torneo_id: string;
    fecha_total: number;
    proxima_fecha_pendiente: number | null;
  }>(
    `SELECT torneo_id, max(numero_fecha) AS fecha_total,
            min(numero_fecha) FILTER (WHERE estado = 'scheduled') AS proxima_fecha_pendiente
     FROM partido
     WHERE torneo_id = ANY($1)
     GROUP BY torneo_id`,
    [idsTorneos],
  );
  const progresoPorTorneo = new Map(
    progresoRows.map((f) => [
      f.torneo_id,
      { fechaActual: f.proxima_fecha_pendiente ?? f.fecha_total, fechaTotal: f.fecha_total },
    ]),
  );

  const { rows: proximoPartidoRows } = await pool.query<{
    torneo_id: string;
    equipo_local_nombre: string;
    equipo_visitante_nombre: string;
    fecha_hora_programada: Date | null;
  }>(
    `SELECT DISTINCT ON (p.torneo_id) p.torneo_id,
            el.nombre AS equipo_local_nombre, ev.nombre AS equipo_visitante_nombre,
            p.fecha_hora_programada
     FROM partido p
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     WHERE p.torneo_id = ANY($1) AND p.estado = 'scheduled'
     ORDER BY p.torneo_id, p.fecha_hora_programada ASC NULLS LAST`,
    [idsTorneos],
  );
  const proximoPartidoPorTorneo = new Map(
    proximoPartidoRows.map((f) => [
      f.torneo_id,
      {
        equipoLocalNombre: f.equipo_local_nombre,
        equipoVisitanteNombre: f.equipo_visitante_nombre,
        fechaHoraProgramada: f.fecha_hora_programada?.toISOString() ?? null,
      },
    ]),
  );

  const { rows: ultimoResultadoRows } = await pool.query<{
    torneo_id: string;
    equipo_local_nombre: string;
    equipo_visitante_nombre: string;
    goles_local: number;
    goles_visitante: number;
  }>(
    `SELECT DISTINCT ON (p.torneo_id) p.torneo_id,
            el.nombre AS equipo_local_nombre, ev.nombre AS equipo_visitante_nombre,
            p.goles_local, p.goles_visitante
     FROM partido p
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     WHERE p.torneo_id = ANY($1) AND p.estado = 'played'
     ORDER BY p.torneo_id, p.fecha_hora_programada DESC NULLS LAST`,
    [idsTorneos],
  );
  const ultimoResultadoPorTorneo = new Map(
    ultimoResultadoRows.map((f) => [
      f.torneo_id,
      {
        equipoLocalNombre: f.equipo_local_nombre,
        equipoVisitanteNombre: f.equipo_visitante_nombre,
        golesLocal: f.goles_local,
        golesVisitante: f.goles_visitante,
      },
    ]),
  );

  const torneosArmados: TorneoPanelOrganizador[] = torneos.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    modalidad: t.modalidad,
    categoriaGenero: t.categoria_genero,
    imagenUrl: t.imagen_url ?? logoOrganizacion,
    estado: t.estado,
    cupoEquipos: t.cupo_equipos,
    inscriptos: Number(t.inscriptos),
    fechaInicioEstimada: t.fecha_inicio_estimada?.toISOString() ?? null,
    fechaFinEstimada: t.fecha_fin_estimada?.toISOString() ?? null,
    inscripcionesPendientes: inscripcionesPendPorTorneo.get(t.id) ?? 0,
    resultadosSinCargar: resultadosSinCargarPorTorneo.get(t.id) ?? 0,
    progreso: progresoPorTorneo.get(t.id) ?? null,
    proximoPartido: proximoPartidoPorTorneo.get(t.id) ?? null,
    ultimoResultado: ultimoResultadoPorTorneo.get(t.id) ?? null,
  }));

  const activos = torneosArmados.filter((t) => t.estado === 'in_progress');
  const finalizados = torneosArmados.filter((t) => t.estado === 'finished');
  const proximos = torneosArmados.filter(
    (t) => t.estado !== 'in_progress' && t.estado !== 'finished',
  );
  const necesitanAtencion = torneosArmados.filter(
    (t) => t.estado !== 'finished' && (t.inscripcionesPendientes > 0 || t.resultadosSinCargar > 0),
  );

  return {
    organizacionId: datos.organizacionId,
    nombreOrganizacion,
    stats: {
      activos: activos.length,
      porComenzar: proximos.length,
      finalizados: finalizados.length,
    },
    necesitanAtencion,
    activos,
    proximos,
    finalizados,
  };
};
