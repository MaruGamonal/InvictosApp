import type { TipoNotificacion } from '@/services/notificaciones/tipos';

/**
 * A dónde manda cada notificación al tocarla. Las de origen `partido`
 * (match_scheduled, match_rescheduled, result_pending_confirmation,
 * result_disputed) no tienen todavía una pantalla propia por partido —
 * quedan sin enlace, visibles igual, en vez de mandar a un 404.
 */
export function construirEnlaceNotificacion(
  tipo: TipoNotificacion,
  entidadOrigenTipo: string | null,
  entidadOrigenId: string | null,
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
    if (tipo === 'registration_received') return `/torneo/${entidadOrigenId}/gestionar`;
    return `/torneo/${entidadOrigenId}`;
  }

  return null;
}
