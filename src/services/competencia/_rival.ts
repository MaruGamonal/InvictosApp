import type { Pool } from 'pg';
import type { Contexto } from '@/lib/contexto';
import { obtenerRolesEnEquipo } from '@/lib/permisos';

/**
 * Quién puede responder a un resultado cargado: **el equipo que no lo
 * cargó**.
 *
 * Un resultado sólo queda `loaded` —esperando respuesta— cuando lo
 * carga el capitán de uno de los dos equipos (`06`, D-95: si lo carga
 * el organizador nace `confirmed`, porque no hay dos versiones que
 * conciliar). Entonces el que tiene algo que decir es el otro: quien
 * cargó ya dio su versión al cargarla.
 *
 * Capitanía **o** delegación, no sólo capitanía: `cargarResultado`
 * notifica a los dos roles cuando queda un resultado por responder, y
 * avisarle a alguien de algo que después no puede hacer es la peor
 * combinación posible. En un equipo amateur, además, el delegado suele
 * ser el que está con el teléfono en la mano.
 */

const ROLES_QUE_RESPONDEN = ['captain', 'delegate'] as const;

export interface PartidoConEquipos {
  equipo_local_id: string;
  equipo_visitante_id: string;
  cargado_por_usuario_id: string | null;
}

/**
 * El equipo rival de quien cargó, o `null` si no se puede determinar
 * —nadie registrado como cargador, o quien cargó no está en ninguno de
 * los dos planteles (un organizador, por ejemplo)—. `null` significa
 * "nadie tiene que responder este resultado", no "cualquiera puede".
 */
export async function resolverEquipoQueResponde(
  pool: Pool,
  partido: PartidoConEquipos,
): Promise<string | null> {
  if (!partido.cargado_por_usuario_id) return null;

  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [partido.cargado_por_usuario_id],
  );
  const perfilDeQuienCargo = rows[0]?.id;
  if (!perfilDeQuienCargo) return null;

  const [enLocal, enVisitante] = await Promise.all([
    obtenerRolesEnEquipo(perfilDeQuienCargo, partido.equipo_local_id),
    obtenerRolesEnEquipo(perfilDeQuienCargo, partido.equipo_visitante_id),
  ]);

  const cargoElLocal = enLocal.some((rol) => ROLES_QUE_RESPONDEN.includes(rol as never));
  const cargoElVisitante = enVisitante.some((rol) => ROLES_QUE_RESPONDEN.includes(rol as never));

  // En los dos equipos a la vez: no hay rival, no hay nada que
  // conciliar. Raro, pero posible — la misma persona en dos planteles.
  if (cargoElLocal && cargoElVisitante) return null;
  if (cargoElLocal) return partido.equipo_visitante_id;
  if (cargoElVisitante) return partido.equipo_local_id;
  return null;
}

/** `true` si quien mira es capitán o delegado de ese equipo. */
export async function puedeResponderPorElEquipo(
  pool: Pool,
  contexto: Contexto,
  equipoId: string,
): Promise<boolean> {
  if (!contexto.usuarioId) return false;
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = rows[0]?.id;
  if (!perfilId) return false;
  const roles = await obtenerRolesEnEquipo(perfilId, equipoId);
  return roles.some((rol) => ROLES_QUE_RESPONDEN.includes(rol as never));
}
