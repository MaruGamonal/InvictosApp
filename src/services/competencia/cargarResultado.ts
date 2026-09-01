import { z } from 'zod';
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
 *    colaboradores cargando la misma fecha desde el mismo complejo.
 * 3. El torneo tiene que estar `in_progress`, y el partido no `cancelled`.
 * 4. Escribe goles, pasa a `played` y fija `estado_resultado`: `loaded`
 *    si cargó un capitán, `confirmed` si cargó el organizador o un
 *    colaborador — nace confirmado, pero eso no cierra la objeción
 *    (`06`, D-95; la objeción en sí es T29, fuera de este ticket).
 * 5. Recalcula `posicion` de los dos equipos como una diferencia, nunca
 *    la tabla entera (`_recalcularPosicion.ts`); si es una corrección
 *    sobre un resultado ya jugado, revierte el efecto anterior y aplica
 *    el nuevo en la misma escritura.
 *
 * Fuera de alcance (`11`, T15): eventos del partido y estadísticas de
 * jugador (T30), confirmación/disputa del otro equipo (T29), partidos no
 * disputados (T16). La invalidación de caché (`10`, 4.7, paso 8) es un
 * no-op: todavía no existe capa de caché en el proyecto.
 */

const esquemaEntrada = z.object({
  partidoId: z.string().uuid(),
  version: z.number().int().positive(),
  golesLocal: z.number().int().min(0),
  golesVisitante: z.number().int().min(0),
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

  const cliente = await pool.connect();
  let nuevaVersion: number;
  try {
    await cliente.query('BEGIN');

    const { rows: actualizadas } = await cliente.query<{ version: number }>(
      `UPDATE partido
       SET goles_local = $2, goles_visitante = $3, estado = 'played',
           estado_resultado = $4, cargado_por_usuario_id = $5, fecha_carga_resultado = now(),
           version = version + 1
       WHERE id = $1
       RETURNING version`,
      [
        datos.partidoId,
        datos.golesLocal,
        datos.golesVisitante,
        estadoResultado,
        contexto.usuarioId,
      ],
    );
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
        seguidoresDe: [{ tipoSeguido: 'tournament', entidadId: partido.torneo_id }],
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
