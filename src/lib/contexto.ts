import { obtenerUsuarioIdDeSesion } from './sesion';

/**
 * Contexto que recibe todo servicio junto a su `input` (`10`, 2.1).
 *
 * Nunca se pasa un objeto de petición u otro artefacto HTTP: la capa de
 * rutas (`src/app/`) resuelve el usuario autenticado y arma este objeto
 * antes de invocar el servicio.
 *
 * `permisos` se completa en T4 (resolución de permisos sobre los tres
 * vínculos — equipo, organización, torneo). Antes de T4 viaja vacío.
 *
 * `esSistema` distingue el contexto de las tareas programadas (`10`,
 * 2.10) de un visitante sin sesión: los dos tienen `usuarioId: null`,
 * pero solo el primero ejecuta con la autoridad del sistema. T4 lo usa
 * para no tratar "nadie inició sesión" como "esto lo pidió el sistema".
 */
export interface Contexto {
  usuarioId: string | null;
  permisos: PermisosResueltos;
  esSistema: boolean;
}

export interface PermisosResueltos {
  // Se define en T4 (`10`, 2.3): resolverPermisos(usuario_id, recurso).
}

/** Contexto de una tarea programada (T26): ejecuta los mismos servicios que un usuario. */
export function contextoDeSistema(): Contexto {
  return { usuarioId: null, permisos: {}, esSistema: true };
}

/**
 * Contexto de una petición real, resuelto en el servidor a partir de la
 * sesión de Supabase Auth. `usuarioId` es `null` cuando no hay sesión —
 * un estado válido (`06`, D-04b), no un error: las superficies públicas
 * se sirven así.
 */
export async function construirContexto(): Promise<Contexto> {
  const usuarioId = await obtenerUsuarioIdDeSesion();
  return { usuarioId, permisos: {}, esSistema: false };
}
