import { z } from 'zod';
import { GOLES_MAXIMOS_POR_EQUIPO } from '@/lib/marcador';
import type { Contexto } from '@/lib/contexto';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError, esErrorDeAplicacion } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { obtenerRolesEnEquipo, verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';
import { notificar } from '@/services/notificaciones/notificar';
import { aplicarResultadoAPosicion } from '@/services/posiciones/_recalcularPosicion';

/**
 * UC-31 — El servicio más invocado del sistema (`11`, T15): **nunca puede
 * existir un resultado cargado que no se refleje en la tabla, ni una
 * tabla que no se explique por los resultados cargados**. Todo pasa en
 * una única transacción, en el orden fijado por `10`, 4.7:
 *
 * 1. Permiso: capitán de alguno de los dos equipos, u organizador o
 *    colaborador asignado (`06`, D-07b) — lo primero pasa por
 *    `verificarPermisoTorneo` (T4); lo segundo, al fallar con
 *    `SIN_PERMISO`, cae a mirar si la persona capitanea alguno de los
 *    dos equipos.
 * 2. `version` del partido → `CONFLICTO_DE_VERSION` si cambió desde que
 *    se leyó (`10`, 2.5 / T-03): es el escenario real de dos
 *    colaboradores cargando la misma fecha desde el mismo complejo. El
 *    `UPDATE` mismo lleva `AND version = $version` en el `WHERE` —la
 *    lectura previa solo evita el viaje a la transacción cuando ya se
 *    sabe que va a fallar—, porque entre esa lectura y el `UPDATE` puede
 *    colarse otra escritura: sin el `WHERE` repitiendo la condición, dos
 *    cargas concurrentes que leyeron la misma versión se pisarían en
 *    silencio en vez de que la segunda reciba `CONFLICTO_DE_VERSION`.
 * 3. El torneo tiene que estar `in_progress`, y el partido no `cancelled`.
 * 4. Escribe goles, pasa a `played` y fija `estado_resultado`: `loaded`
 *    si cargó un capitán, `confirmed` si cargó el organizador o un
 *    colaborador — nace confirmado, pero eso no cierra la objeción
 *    (`06`, D-95; la objeción en sí es T29, fuera de este ticket).
 * 5. Recalcula `posicion` de los dos equipos como una diferencia, nunca
 *    la tabla entera (`_recalcularPosicion.ts`); si es una corrección
 *    sobre un resultado ya jugado, revierte el efecto anterior y aplica
 *    el nuevo en la misma escritura.
 * 6. **[T30]** `eventos` es opcional (UC-34): goles y tarjetas
 *    atribuidos a alguien de la **lista de buena fe de este torneo**
 *    (`integrante_habilitado`, `06` D-26) — nunca del plantel permanente.
 *    Solo se acreditan goles a `rol_en_torneo = 'player'`; las tarjetas
 *    también al `coach`. Si `eventos` viene indefinido, no se toca nada
 *    (corrección de marcador sin tocar la planilla); si viene (aunque sea
 *    vacío), reemplaza por completo lo cargado antes para este partido:
 *    revierte el acumulado anterior de `estadistica_jugador` y aplica el
 *    nuevo, en la misma transacción — mismo criterio que el marcador.
 *
 * Fuera de alcance: confirmación/disputa del otro equipo (T29), partidos
 * no disputados (T16), sanciones automáticas por tarjetas (`06`, D-34b).
 */

const TIPOS_EVENTO = ['goal', 'own_goal', 'yellow_card', 'red_card'] as const;
type TipoEvento = (typeof TIPOS_EVENTO)[number];

const esquemaEvento = z.object({
  perfilId: z.string().uuid(),
  equipoId: z.string().uuid(),
  tipoEvento: z.enum(TIPOS_EVENTO),
  minuto: z.number().int().min(0).optional(),
});
export type EventoResultadoInput = z.infer<typeof esquemaEvento>;

const esquemaEntrada = z.object({
  partidoId: z.string().uuid(),
  version: z.number().int().positive(),
  golesLocal: z.number().int().min(0).max(GOLES_MAXIMOS_POR_EQUIPO),
  golesVisitante: z.number().int().min(0).max(GOLES_MAXIMOS_POR_EQUIPO),
  /** UC-34, opcional: si viene, reemplaza por completo la planilla de este partido. */
  eventos: z.array(esquemaEvento).optional(),
  /**
   * Opcional: `null` lo quita, sin mandarlo se deja como está. Igual que
   * `eventos`, solo alguien elegible (`integrante_habilitado`,
   * `rol_en_torneo = 'player'`) de alguno de los dos equipos.
   */
  jugadorDelPartidoPerfilId: z.string().uuid().nullable().optional(),
});
export type CargarResultadoInput = z.infer<typeof esquemaEntrada>;

export interface CargarResultadoResultado {
  estado: 'played';
  estadoResultado: 'loaded' | 'confirmed';
  golesLocal: number;
  golesVisitante: number;
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
  version: number;
  torneo_estado: string;
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
}

async function esCapitanDeAlgunEquipo(
  contexto: Contexto,
  equipoLocalId: string,
  equipoVisitanteId: string,
): Promise<boolean> {
  if (!contexto.usuarioId) return false;
  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = rows[0]?.id;
  if (!perfilId) return false;

  const [rolesLocal, rolesVisitante] = await Promise.all([
    obtenerRolesEnEquipo(perfilId, equipoLocalId),
    obtenerRolesEnEquipo(perfilId, equipoVisitanteId),
  ]);
  return rolesLocal.includes('captain') || rolesVisitante.includes('captain');
}

export const cargarResultado: Servicio<CargarResultadoInput, CargarResultadoResultado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<FilaPartido>(
    `SELECT p.torneo_id, p.grupo_id, p.equipo_local_id, p.equipo_visitante_id, p.estado,
            p.goles_local, p.goles_visitante, p.version,
            t.estado AS torneo_estado, t.puntos_victoria, t.puntos_empate, t.puntos_derrota
     FROM partido p JOIN torneo t ON t.id = p.torneo_id
     WHERE p.id = $1`,
    [datos.partidoId],
  );
  const partido = rows[0];
  if (!partido) throw crearError('NO_ENCONTRADO');

  let estadoResultado: 'loaded' | 'confirmed';
  try {
    await verificarPermisoTorneo(contexto, partido.torneo_id, 'cargar_resultados');
    estadoResultado = 'confirmed';
  } catch (error) {
    if (!esErrorDeAplicacion(error) || error.codigo !== 'SIN_PERMISO') throw error;
    const esCapitan = await esCapitanDeAlgunEquipo(
      contexto,
      partido.equipo_local_id,
      partido.equipo_visitante_id,
    );
    if (!esCapitan) throw error;
    estadoResultado = 'loaded';
  }

  if (datos.version !== partido.version) {
    throw crearError('CONFLICTO_DE_VERSION', {
      version: partido.version,
      golesLocal: partido.goles_local,
      golesVisitante: partido.goles_visitante,
      estado: partido.estado,
    });
  }

  if (partido.torneo_estado !== 'in_progress') throw crearError('TORNEO_NO_EN_CURSO');
  if (partido.estado === 'cancelled') {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'partidoId', problema: 'Un partido cancelado no puede tener un resultado cargado.' },
    ]);
  }

  const equiposDelPartido = new Set([partido.equipo_local_id, partido.equipo_visitante_id]);
  if (datos.eventos && datos.eventos.length > 0) {
    const perfilIds = [...new Set(datos.eventos.map((evento) => evento.perfilId))];
    const { rows: elegibles } = await pool.query<{
      perfil_id: string;
      equipo_id: string;
      rol_en_torneo: 'player' | 'coach' | 'delegate';
    }>(
      `SELECT perfil_id, equipo_id, rol_en_torneo FROM integrante_habilitado
       WHERE torneo_id = $1 AND equipo_id = ANY($2) AND perfil_id = ANY($3) AND estado = 'eligible'`,
      [partido.torneo_id, [...equiposDelPartido], perfilIds],
    );
    const rolPorClave = new Map(
      elegibles.map((fila) => [`${fila.equipo_id}:${fila.perfil_id}`, fila.rol_en_torneo]),
    );

    for (const evento of datos.eventos) {
      if (!equiposDelPartido.has(evento.equipoId)) {
        throw crearError('DATOS_INVALIDOS', [
          { campo: 'eventos', problema: 'El equipo indicado no juega este partido.' },
        ]);
      }
      const rol = rolPorClave.get(`${evento.equipoId}:${evento.perfilId}`);
      if (!rol) {
        throw crearError('DATOS_INVALIDOS', [
          {
            campo: 'eventos',
            problema:
              'Solo se puede acreditar un evento a alguien habilitado en la lista de buena fe de este torneo.',
          },
        ]);
      }
      const esGol = evento.tipoEvento === 'goal' || evento.tipoEvento === 'own_goal';
      if (esGol && rol !== 'player') {
        throw crearError('DATOS_INVALIDOS', [
          { campo: 'eventos', problema: 'Los goles solo se acreditan a jugadores.' },
        ]);
      }
      if (!esGol && rol !== 'player' && rol !== 'coach') {
        throw crearError('DATOS_INVALIDOS', [
          {
            campo: 'eventos',
            problema: 'Las tarjetas se acreditan a jugadores o al cuerpo técnico.',
          },
        ]);
      }
    }
  }

  if (datos.jugadorDelPartidoPerfilId) {
    const { rows: elegible } = await pool.query<{ rol_en_torneo: 'player' | 'coach' | 'delegate' }>(
      `SELECT rol_en_torneo FROM integrante_habilitado
       WHERE torneo_id = $1 AND equipo_id = ANY($2) AND perfil_id = $3 AND estado = 'eligible'`,
      [partido.torneo_id, [...equiposDelPartido], datos.jugadorDelPartidoPerfilId],
    );
    if (elegible[0]?.rol_en_torneo !== 'player') {
      throw crearError('DATOS_INVALIDOS', [
        {
          campo: 'jugadorDelPartidoPerfilId',
          problema:
            'Solo se puede elegir a un jugador habilitado en la lista de buena fe de alguno de los dos equipos.',
        },
      ]);
    }
  }

  const cliente = await pool.connect();
  let nuevaVersion: number;
  try {
    await cliente.query('BEGIN');

    const asignaciones = [
      'goles_local = $2',
      'goles_visitante = $3',
      "estado = 'played'",
      'estado_resultado = $4',
      'cargado_por_usuario_id = $5',
      'fecha_carga_resultado = now()',
      'version = version + 1',
    ];
    const valoresUpdate: unknown[] = [
      datos.partidoId,
      datos.golesLocal,
      datos.golesVisitante,
      estadoResultado,
      contexto.usuarioId,
    ];
    if (datos.jugadorDelPartidoPerfilId !== undefined) {
      valoresUpdate.push(datos.jugadorDelPartidoPerfilId);
      asignaciones.push(`jugador_del_partido_perfil_id = $${valoresUpdate.length}`);
    }
    valoresUpdate.push(datos.version);

    const { rows: actualizadas } = await cliente.query<{ version: number }>(
      `UPDATE partido
       SET ${asignaciones.join(', ')}
       WHERE id = $1 AND version = $${valoresUpdate.length}
       RETURNING version`,
      valoresUpdate,
    );
    if (actualizadas.length === 0) {
      // Alguien más ganó la carrera entre la lectura de arriba y este
      // UPDATE: mismo error que el chequeo previo, con el detalle que
      // ya se tenía a mano (no hace falta releer para informarlo).
      throw crearError('CONFLICTO_DE_VERSION', {
        version: partido.version,
        golesLocal: partido.goles_local,
        golesVisitante: partido.goles_visitante,
        estado: partido.estado,
      });
    }
    nuevaVersion = actualizadas[0]!.version;

    if (partido.grupo_id) {
      await aplicarResultadoAPosicion(
        cliente,
        partido.grupo_id,
        partido.equipo_local_id,
        partido.equipo_visitante_id,
        datos.golesLocal,
        datos.golesVisitante,
        partido.goles_local,
        partido.goles_visitante,
        {
          puntosVictoria: partido.puntos_victoria,
          puntosEmpate: partido.puntos_empate,
          puntosDerrota: partido.puntos_derrota,
        },
      );
    }

    if (datos.eventos !== undefined) {
      const { rows: previos } = await cliente.query<{
        perfil_id: string;
        equipo_id: string;
        tipo_evento: TipoEvento;
      }>('SELECT perfil_id, equipo_id, tipo_evento FROM evento_partido WHERE partido_id = $1', [
        datos.partidoId,
      ]);

      const deltas = new Map<
        string,
        { perfilId: string; equipoId: string; goles: number; amarillas: number; rojas: number }
      >();
      const aplicarDelta = (
        perfilId: string,
        equipoId: string,
        tipoEvento: TipoEvento,
        signo: 1 | -1,
      ) => {
        const clave = `${equipoId}:${perfilId}`;
        const acumulado = deltas.get(clave) ?? {
          perfilId,
          equipoId,
          goles: 0,
          amarillas: 0,
          rojas: 0,
        };
        if (tipoEvento === 'goal') acumulado.goles += signo;
        if (tipoEvento === 'yellow_card') acumulado.amarillas += signo;
        if (tipoEvento === 'red_card') acumulado.rojas += signo;
        deltas.set(clave, acumulado);
      };
      for (const previo of previos)
        aplicarDelta(previo.perfil_id, previo.equipo_id, previo.tipo_evento, -1);
      for (const evento of datos.eventos)
        aplicarDelta(evento.perfilId, evento.equipoId, evento.tipoEvento, 1);

      await cliente.query('DELETE FROM evento_partido WHERE partido_id = $1', [datos.partidoId]);

      for (const evento of datos.eventos) {
        await cliente.query(
          `INSERT INTO evento_partido (partido_id, perfil_id, equipo_id, tipo_evento, minuto, registrado_por_usuario_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            datos.partidoId,
            evento.perfilId,
            evento.equipoId,
            evento.tipoEvento,
            evento.minuto ?? null,
            contexto.usuarioId,
          ],
        );
      }

      for (const delta of deltas.values()) {
        if (delta.goles === 0 && delta.amarillas === 0 && delta.rojas === 0) continue;
        await cliente.query(
          `INSERT INTO estadistica_jugador (torneo_id, perfil_id, equipo_id, goles, tarjetas_amarillas, tarjetas_rojas)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (torneo_id, perfil_id, equipo_id) DO UPDATE SET
             goles = estadistica_jugador.goles + excluded.goles,
             tarjetas_amarillas = estadistica_jugador.tarjetas_amarillas + excluded.tarjetas_amarillas,
             tarjetas_rojas = estadistica_jugador.tarjetas_rojas + excluded.tarjetas_rojas,
             ultima_actualizacion = now()`,
          [
            partido.torneo_id,
            delta.perfilId,
            delta.equipoId,
            delta.goles,
            delta.amarillas,
            delta.rojas,
          ],
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

  const { rows: gestores } = await pool.query<{ usuario_id: string | null }>(
    `SELECT pd.usuario_id
     FROM integrante_equipo ie
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE ie.equipo_id = ANY($1) AND ie.estado_vinculo = 'active' AND ie.rol_equipo IN ('captain', 'delegate')`,
    [[partido.equipo_local_id, partido.equipo_visitante_id]],
  );
  const usuarioIds = gestores.map((g) => g.usuario_id).filter((id): id is string => id !== null);

  await notificar(
    {
      tipo: estadoResultado === 'confirmed' ? 'result_published' : 'result_pending_confirmation',
      entidadOrigenTipo: 'partido',
      entidadOrigenId: datos.partidoId,
      destinatarios: {
        usuarioIds,
        seguidoresDe: [
          { tipoSeguido: 'tournament', entidadId: partido.torneo_id },
          { tipoSeguido: 'team', entidadId: partido.equipo_local_id },
          { tipoSeguido: 'team', entidadId: partido.equipo_visitante_id },
        ],
      },
    },
    contexto,
  );

  return {
    estado: 'played',
    estadoResultado,
    golesLocal: datos.golesLocal,
    golesVisitante: datos.golesVisitante,
    version: nuevaVersion,
  };
};
