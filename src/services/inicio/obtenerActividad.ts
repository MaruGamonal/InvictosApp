import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import type { TipoNotificacion } from '@/services/notificaciones/tipos';

/**
 * UC-44 — La actividad de lo que sigo: **derivada, no editorial** (`06`,
 * D-11b) — no hay posts ni comentarios, cada item sale de un hecho real
 * ya escrito por otro servicio. Reutiliza dos fuentes que ya existen en
 * vez de inventar un log de eventos propio:
 *
 * 1. `notificacion`, filtrada a sus tipos **informativos**
 *    (`tipos.ts` — `tournament_published/started/finished`,
 *    `result_published`) — ya se genera con destinatarios resueltos
 *    (`notificar()`, incluidos los seguidores de torneo/equipo) cada vez
 *    que pasa algo relevante; el centro de notificaciones (UC-46) ya
 *    muestra el resto (lo accionable) desde la misma tabla.
 * 2. `inscripcion` con `estado = 'approved'`, para "el equipo se sumó a
 *    un torneo" — no hay un tipo de notificación informativo para esto
 *    (`registration_resolved` es accionable y va solo a quien lo pidió),
 *    así que se lee directo de la fuente con `fecha_resolucion`.
 *
 * "Lo que sigo" es literalmente `seguimiento` (UC-42/43) — que ya incluye,
 * por auto-seguimiento, los equipos propios (`_vinculo.ts`) y los torneos
 * donde juegan (`solicitarInscripcion.ts`): no hace falta resolver esa
 * unión acá.
 *
 * Lo que queda fuera, por falta de una columna con timestamp real donde
 * apoyarse (no hardcodear una fecha inventada): reprogramación de partido
 * (`partido` no guarda cuándo se reprogramó, solo el before/after) y el
 * "jugador del partido" como item propio — va como atributo de
 * `result_published`, con el mismo timestamp del resultado, en vez de
 * duplicar el evento con una fecha falsa.
 */

const TIPOS_FEED: TipoNotificacion[] = [
  'tournament_published',
  'tournament_started',
  'tournament_finished',
  'result_published',
];

const esquemaEntrada = z.object({ limite: z.number().int().positive().max(50).optional() });
export type ObtenerActividadInput = z.infer<typeof esquemaEntrada>;

export interface ActividadTorneoInfo {
  id: string;
  nombre: string;
  imagenUrl: string | null;
}

export interface ActividadEquipoInfo {
  id: string;
  nombre: string;
  escudoUrl: string | null;
}

export type ItemActividad =
  | { tipo: 'tournament_published'; id: string; fecha: string; torneo: ActividadTorneoInfo }
  | { tipo: 'tournament_started'; id: string; fecha: string; torneo: ActividadTorneoInfo }
  | { tipo: 'tournament_finished'; id: string; fecha: string; torneo: ActividadTorneoInfo }
  | {
      tipo: 'result_published';
      id: string;
      fecha: string;
      partidoId: string;
      torneo: ActividadTorneoInfo;
      equipoLocal: ActividadEquipoInfo;
      equipoVisitante: ActividadEquipoInfo;
      golesLocal: number;
      golesVisitante: number;
      jugadorDelPartido: { perfilId: string; nombreVisible: string } | null;
    }
  | {
      tipo: 'team_joined_tournament';
      id: string;
      fecha: string;
      torneo: ActividadTorneoInfo;
      equipo: ActividadEquipoInfo;
    };

export interface ActividadResultado {
  items: ItemActividad[];
  /** Sin ningún equipo ni torneo seguido (ni propio, por auto-seguimiento) — UC-44, flujo alternativo: invitación a descubrir, no pantalla vacía. */
  sinSeguimientos: boolean;
}

const LIMITE_DEFECTO = 30;

export const obtenerActividad: Servicio<ObtenerActividadInput, ActividadResultado> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);
  const limite = datos.limite ?? LIMITE_DEFECTO;
  const pool = obtenerPool();

  const { rows: seguidos } = await pool.query<{
    tipo_seguido: 'tournament' | 'team';
    entidad_seguida_id: string;
  }>(`SELECT tipo_seguido, entidad_seguida_id FROM seguimiento WHERE usuario_id = $1`, [
    contexto.usuarioId,
  ]);
  const equiposSeguidos = seguidos
    .filter((fila) => fila.tipo_seguido === 'team')
    .map((fila) => fila.entidad_seguida_id);
  if (seguidos.length === 0) {
    return { items: [], sinSeguimientos: true };
  }

  const [notifResultado, inscripcionResultado] = await Promise.all([
    pool.query<{
      id: string;
      tipo: TipoNotificacion;
      entidad_origen_tipo: string | null;
      entidad_origen_id: string | null;
      fecha_generacion: Date;
    }>(
      `SELECT id, tipo, entidad_origen_tipo, entidad_origen_id, fecha_generacion
       FROM notificacion
       WHERE usuario_id = $1 AND canal = 'in_app' AND tipo = ANY($2)
       ORDER BY fecha_generacion DESC
       LIMIT $3`,
      [contexto.usuarioId, TIPOS_FEED, limite],
    ),
    equiposSeguidos.length > 0
      ? pool.query<{
          torneo_id: string;
          equipo_id: string;
          fecha_resolucion: Date;
          torneo_nombre: string;
          torneo_imagen_url: string | null;
          organizacion_logo_url: string | null;
          equipo_nombre: string;
          escudo_url: string | null;
        }>(
          `SELECT i.torneo_id, i.equipo_id, i.fecha_resolucion,
                  t.nombre AS torneo_nombre, t.imagen_url AS torneo_imagen_url,
                  o.logo_url AS organizacion_logo_url,
                  e.nombre AS equipo_nombre, e.escudo_url
           FROM inscripcion i
           JOIN torneo t ON t.id = i.torneo_id
           JOIN organizacion o ON o.id = t.organizacion_id
           JOIN equipo e ON e.id = i.equipo_id
           WHERE i.estado = 'approved' AND i.equipo_id = ANY($1)
           ORDER BY i.fecha_resolucion DESC
           LIMIT $2`,
          [equiposSeguidos, limite],
        )
      : Promise.resolve({ rows: [] as never[] }),
  ]);

  const torneoIds = [
    ...new Set(
      notifResultado.rows
        .filter((fila) => fila.entidad_origen_tipo === 'torneo' && fila.entidad_origen_id)
        .map((fila) => fila.entidad_origen_id!),
    ),
  ];
  const partidoIds = [
    ...new Set(
      notifResultado.rows
        .filter((fila) => fila.entidad_origen_tipo === 'partido' && fila.entidad_origen_id)
        .map((fila) => fila.entidad_origen_id!),
    ),
  ];

  const [torneosResultado, partidosResultado] = await Promise.all([
    torneoIds.length > 0
      ? pool.query<{
          id: string;
          nombre: string;
          imagen_url: string | null;
          organizacion_logo_url: string | null;
        }>(
          `SELECT t.id, t.nombre, t.imagen_url, o.logo_url AS organizacion_logo_url
           FROM torneo t JOIN organizacion o ON o.id = t.organizacion_id
           WHERE t.id = ANY($1)`,
          [torneoIds],
        )
      : Promise.resolve({ rows: [] as never[] }),
    partidoIds.length > 0
      ? pool.query<{
          id: string;
          torneo_id: string;
          torneo_nombre: string;
          torneo_imagen_url: string | null;
          organizacion_logo_url: string | null;
          goles_local: number;
          goles_visitante: number;
          local_id: string;
          local_nombre: string;
          local_escudo: string | null;
          visitante_id: string;
          visitante_nombre: string;
          visitante_escudo: string | null;
          jugador_del_partido_perfil_id: string | null;
          jugador_del_partido_nombre: string | null;
        }>(
          `SELECT p.id, p.torneo_id, t.nombre AS torneo_nombre, t.imagen_url AS torneo_imagen_url,
                  o.logo_url AS organizacion_logo_url, p.goles_local, p.goles_visitante,
                  el.id AS local_id, el.nombre AS local_nombre, el.escudo_url AS local_escudo,
                  ev.id AS visitante_id, ev.nombre AS visitante_nombre, ev.escudo_url AS visitante_escudo,
                  jp.id AS jugador_del_partido_perfil_id, jp.nombre_visible AS jugador_del_partido_nombre
           FROM partido p
           JOIN torneo t ON t.id = p.torneo_id
           JOIN organizacion o ON o.id = t.organizacion_id
           JOIN equipo el ON el.id = p.equipo_local_id
           JOIN equipo ev ON ev.id = p.equipo_visitante_id
           LEFT JOIN perfil_deportivo jp ON jp.id = p.jugador_del_partido_perfil_id
           WHERE p.id = ANY($1)`,
          [partidoIds],
        )
      : Promise.resolve({ rows: [] as never[] }),
  ]);

  const torneoPorId = new Map(torneosResultado.rows.map((fila) => [fila.id, fila]));
  const partidoPorId = new Map(partidosResultado.rows.map((fila) => [fila.id, fila]));

  const itemsDeNotificaciones: ItemActividad[] = [];
  for (const fila of notifResultado.rows) {
    if (fila.tipo === 'result_published') {
      const partido = partidoPorId.get(fila.entidad_origen_id ?? '');
      if (!partido) continue;
      itemsDeNotificaciones.push({
        tipo: 'result_published',
        id: fila.id,
        fecha: fila.fecha_generacion.toISOString(),
        partidoId: partido.id,
        torneo: {
          id: partido.torneo_id,
          nombre: partido.torneo_nombre,
          imagenUrl: partido.torneo_imagen_url ?? partido.organizacion_logo_url,
        },
        equipoLocal: {
          id: partido.local_id,
          nombre: partido.local_nombre,
          escudoUrl: partido.local_escudo,
        },
        equipoVisitante: {
          id: partido.visitante_id,
          nombre: partido.visitante_nombre,
          escudoUrl: partido.visitante_escudo,
        },
        golesLocal: partido.goles_local,
        golesVisitante: partido.goles_visitante,
        jugadorDelPartido: partido.jugador_del_partido_perfil_id
          ? {
              perfilId: partido.jugador_del_partido_perfil_id,
              nombreVisible: partido.jugador_del_partido_nombre!,
            }
          : null,
      });
    } else if (
      fila.tipo === 'tournament_published' ||
      fila.tipo === 'tournament_started' ||
      fila.tipo === 'tournament_finished'
    ) {
      const torneo = torneoPorId.get(fila.entidad_origen_id ?? '');
      if (!torneo) continue;
      itemsDeNotificaciones.push({
        tipo: fila.tipo,
        id: fila.id,
        fecha: fila.fecha_generacion.toISOString(),
        torneo: {
          id: torneo.id,
          nombre: torneo.nombre,
          imagenUrl: torneo.imagen_url ?? torneo.organizacion_logo_url,
        },
      });
    }
  }

  const itemsDeInscripciones: ItemActividad[] = inscripcionResultado.rows.map((fila) => ({
    tipo: 'team_joined_tournament',
    id: `insc:${fila.torneo_id}:${fila.equipo_id}`,
    fecha: fila.fecha_resolucion.toISOString(),
    torneo: {
      id: fila.torneo_id,
      nombre: fila.torneo_nombre,
      imagenUrl: fila.torneo_imagen_url ?? fila.organizacion_logo_url,
    },
    equipo: { id: fila.equipo_id, nombre: fila.equipo_nombre, escudoUrl: fila.escudo_url },
  }));

  const items = [...itemsDeNotificaciones, ...itemsDeInscripciones]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, limite);

  return { items, sinSeguimientos: false };
};
