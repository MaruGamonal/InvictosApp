/**
 * Contexto que recibe todo servicio junto a su `input` (`10`, 2.1).
 *
 * Nunca se pasa un objeto de petición u otro artefacto HTTP: la capa de
 * rutas (`src/app/`) resuelve el usuario autenticado y arma este objeto
 * antes de invocar el servicio.
 *
 * `permisos` se completa en T4 (resolución de permisos sobre los tres
 * vínculos — equipo, organización, torneo). Antes de T4 viaja vacío.
 */
export interface Contexto {
  usuarioId: string | null;
  permisos: PermisosResueltos;
}

export interface PermisosResueltos {
  // Se define en T4 (`10`, 2.3): resolverPermisos(usuario_id, recurso).
}

export function contextoDeSistema(): Contexto {
  return { usuarioId: null, permisos: {} };
}
