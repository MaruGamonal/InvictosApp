import { obtenerPool } from '@/db/cliente';
import { crearError } from './errores';
import type { Contexto } from './contexto';

/**
 * Resolución de permisos (`10`, 2.3 / T4). Los permisos no viven en la
 * cuenta: viven en el vínculo de la persona con una cosa puntual (`06`,
 * D-23, D-32). Hay exactamente tres vínculos, y **ningún archivo de
 * `src/services/` debería consultarlos por su cuenta** — todos pasan por
 * las funciones de este módulo. (Lo verifica `permisos.arquitectura.test.ts`.)
 *
 * | Vínculo | Tabla | Alcance |
 * |---|---|---|
 * | Persona ↔ equipo | integrante_equipo | Ese equipo |
 * | Persona ↔ organización | miembro_organizacion | Todos los torneos de esa organización |
 * | Persona ↔ torneo | colaborador_torneo | Un torneo puntual |
 *
 * Todas las funciones de verificación reciben el `Contexto` de la
 * invocación, no un `usuarioId` suelto: un contexto de sistema
 * (`esSistema: true`, `10`, 2.10) pasa siempre — es como las tareas
 * programadas ejecutan la misma lógica que un usuario sin que haga falta
 * un usuario detrás.
 */

export type RolOrganizacion = 'owner' | 'admin' | null;
export type RolEquipo = 'captain' | 'delegate' | 'player' | 'coach';

export type AccionOrganizacion =
  | 'gestionar_torneos'
  | 'gestionar_colaboradores'
  | 'gestionar_administradores'
  | 'transferir_titularidad';

export type AccionTorneo =
  | 'configurar_torneo'
  | 'resolver_inscripciones'
  | 'asignar_colaboradores'
  | 'cargar_resultados'
  | 'programar_partidos'
  | 'registrar_no_disputados';

export type AccionEquipo = 'gestionar_plantel' | 'inscribir_a_torneo';

/** Roles activos de una persona en un equipo puntual. */
export async function obtenerRolesEnEquipo(
  usuarioPerfilId: string,
  equipoId: string,
): Promise<RolEquipo[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ rol_equipo: RolEquipo }>(
    `SELECT rol_equipo FROM integrante_equipo
     WHERE perfil_id = $1 AND equipo_id = $2 AND estado_vinculo = 'active'`,
    [usuarioPerfilId, equipoId],
  );
  return rows.map((r) => r.rol_equipo);
}

/** Rol de una persona en una organización (`owner`, `admin`, o `null` si no es miembro). */
export async function obtenerRolEnOrganizacion(
  usuarioId: string,
  organizacionId: string,
): Promise<RolOrganizacion> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ rol: 'owner' | 'admin' }>(
    `SELECT rol FROM miembro_organizacion WHERE usuario_id = $1 AND organizacion_id = $2`,
    [usuarioId, organizacionId],
  );
  // owner pesa más que admin si por algún motivo hubiera dos filas (no debería).
  return rows.find((r) => r.rol === 'owner')?.rol ?? rows[0]?.rol ?? null;
}

/** Si una persona es colaboradora activa de un torneo puntual. */
export async function esColaboradorActivo(usuarioId: string, torneoId: string): Promise<boolean> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT 1 FROM colaborador_torneo WHERE usuario_id = $1 AND torneo_id = $2 AND estado = 'active'`,
    [usuarioId, torneoId],
  );
  return rows.length > 0;
}

async function obtenerOrganizacionDelTorneo(torneoId: string): Promise<string | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ organizacion_id: string }>(
    'SELECT organizacion_id FROM torneo WHERE id = $1',
    [torneoId],
  );
  return rows[0]?.organizacion_id ?? null;
}

/**
 * Verifica que el contexto pueda hacer `accion` sobre la organización, y
 * lanza el error exacto de `10`, 8.2 cuando no puede.
 *
 * El Titular puede todo. El Administrador puede gestionar torneos y
 * colaboradores, pero no crear/quitar Administradores (`06`, D-64) ni
 * transferir la titularidad — eso es del Titular exclusivamente.
 */
export async function verificarPermisoOrganizacion(
  contexto: Contexto,
  organizacionId: string,
  accion: AccionOrganizacion,
): Promise<void> {
  if (contexto.esSistema) return;
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const rol = await obtenerRolEnOrganizacion(contexto.usuarioId, organizacionId);

  if (rol === 'owner') return;

  if (rol === 'admin') {
    if (accion === 'gestionar_torneos' || accion === 'gestionar_colaboradores') return;
    if (accion === 'gestionar_administradores') throw crearError('ADMIN_NO_PUEDE_GESTIONAR_ADMINS');
    if (accion === 'transferir_titularidad') throw crearError('ROL_TITULAR_NO_GESTIONABLE');
  }

  throw crearError('SIN_PERMISO');
}

/**
 * Verifica que el contexto pueda hacer `accion` sobre un torneo puntual.
 * El rol de organización (Titular/Administrador) habilita todo; el
 * Colaborador solo las tres acciones fijas de `06`, D-32, y solo en el
 * torneo al que está asignado — nunca en otro, aunque sea de la misma
 * organización.
 */
export async function verificarPermisoTorneo(
  contexto: Contexto,
  torneoId: string,
  accion: AccionTorneo,
): Promise<void> {
  if (contexto.esSistema) return;
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const organizacionId = await obtenerOrganizacionDelTorneo(torneoId);
  if (!organizacionId) throw crearError('NO_ENCONTRADO');

  const rolOrganizacion = await obtenerRolEnOrganizacion(contexto.usuarioId, organizacionId);
  if (rolOrganizacion === 'owner' || rolOrganizacion === 'admin') return;

  const accionesDeColaborador: AccionTorneo[] = [
    'cargar_resultados',
    'programar_partidos',
    'registrar_no_disputados',
  ];
  if (
    accionesDeColaborador.includes(accion) &&
    (await esColaboradorActivo(contexto.usuarioId, torneoId))
  ) {
    return;
  }

  throw crearError('SIN_PERMISO');
}

/**
 * Verifica que el contexto pueda hacer `accion` sobre un equipo. Capitán y
 * Delegado gestionan; Jugador y DT no, sin importar cuántos vínculos
 * tengan con el equipo (`06`, D-25): el rol `coach` es deportivo, nunca
 * administrativo por sí solo.
 *
 * `usuarioPerfilId` es el `perfil_deportivo_id` de quien invoca, no su
 * `usuario_id`: este vínculo se resuelve contra la identidad deportiva
 * (`03`, 3.6), que es la que puede no tener cuenta.
 */
export async function verificarPermisoEquipo(
  contexto: Contexto,
  usuarioPerfilId: string | null,
  equipoId: string,
  _accion: AccionEquipo,
): Promise<void> {
  if (contexto.esSistema) return;
  if (!contexto.usuarioId || !usuarioPerfilId) throw crearError('NO_AUTENTICADO');

  const roles = await obtenerRolesEnEquipo(usuarioPerfilId, equipoId);
  const puedeGestionar = roles.includes('captain') || roles.includes('delegate');

  if (!puedeGestionar) throw crearError('SIN_PERMISO');
}

/**
 * El Capitán es único por equipo y no puede dejar de serlo sin haber
 * designado reemplazo antes (`02`, UC-13). Lo verifica quien vaya a
 * ejecutar la baja (T19), antes de escribir `left`.
 */
export async function verificarPuedeDejarEquipo(equipoId: string, perfilId: string): Promise<void> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ perfil_capitan_id: string }>(
    'SELECT perfil_capitan_id FROM equipo WHERE id = $1',
    [equipoId],
  );
  if (rows[0]?.perfil_capitan_id === perfilId) {
    throw crearError('CAPITAN_SIN_REEMPLAZO');
  }
}

/**
 * Un torneo en `draft` solo es visible para quien administra su
 * organización. Para cualquier otro, la respuesta es `NO_ENCONTRADO` — no
 * `SIN_PERMISO` — para no confirmarle a un desconocido que ese torneo
 * existe (`10`, 2.3).
 */
export async function verificarPuedeVerTorneo(
  contexto: Contexto,
  torneo: { id: string; organizacionId: string; estado: string },
): Promise<void> {
  if (contexto.esSistema || torneo.estado !== 'draft') return;

  const rol = contexto.usuarioId
    ? await obtenerRolEnOrganizacion(contexto.usuarioId, torneo.organizacionId)
    : null;
  const esColaborador = contexto.usuarioId
    ? await esColaboradorActivo(contexto.usuarioId, torneo.id)
    : false;

  if (rol === 'owner' || rol === 'admin' || esColaborador) return;

  throw crearError('NO_ENCONTRADO');
}
