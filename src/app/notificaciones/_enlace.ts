import type { TipoNotificacion } from '@/services/notificaciones/tipos';

/**
 * A dónde manda cada notificación al tocarla. Las de origen `partido`
 * (match_scheduled, match_rescheduled, result_pending_confirmation,
 * result_disputed) no tienen todavía una pantalla propia por partido —
 * quedan sin enlace, visibles igual, en vez de mandar a un 404.
 *
 * **El modo no se pierde al tocar una notificación.** Reportado en
 * vivo: quien estaba gestionando una organización tocaba un aviso de su
 * propio torneo y aparecía en la ficha pública, con el nav de Jugador,
 * sin haber pedido cambiar de modo. Un centro de notificaciones que
 * cambia el contexto de trabajo obliga a rehacer el camino de vuelta.
 *
 * En modo organizador, un torneo lleva a su panel de gestión: es el
 * torneo visto desde donde la persona estaba parada. Un equipo, en
 * cambio, sigue yendo a su ficha — un equipo no es de la organización,
 * así que no hay una vista de organizador que mostrar.
 */
export type ModoNavegacion = 'jugador' | 'organizador';

export function construirEnlaceNotificacion(
  tipo: TipoNotificacion,
  entidadOrigenTipo: string | null,
  entidadOrigenId: string | null,
  modo: ModoNavegacion = 'jugador',
): string | null {
  if (!entidadOrigenId) return null;

  if (entidadOrigenTipo === 'equipo') {
    if (tipo === 'team_invitation') return `/equipo/${entidadOrigenId}/invitacion`;
    if (tipo === 'team_join_requested' || tipo === 'roster_required') {
      return `/equipo/${entidadOrigenId}/gestionar`;
    }
    return `/equipo/${entidadOrigenId}`;
  }

  if (entidadOrigenTipo === 'torneo') {
    if (modo === 'organizador') return `/torneo/${entidadOrigenId}/gestionar`;
    if (tipo === 'registration_received') return `/torneo/${entidadOrigenId}/gestionar`;
    return `/torneo/${entidadOrigenId}`;
  }

  return null;
}
