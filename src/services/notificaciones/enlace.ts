import type { TipoNotificacion } from './tipos';

/**
 * A dónde manda cada notificación: la ruta la usa el centro de
 * notificaciones al tocar una, y el correo de esa misma notificación
 * para su botón. Vive en `services` y no en la pantalla porque el
 * despachador de correos también es un servicio, y dos criterios de
 * enlace para el mismo aviso terminarían separándose.
 *
 * A dónde manda cada notificación al tocarla.
 *
 * Las cuatro de origen `partido` (match_scheduled, match_rescheduled,
 * result_pending_confirmation, result_disputed) estuvieron mucho tiempo
 * sin enlace: no existía una pantalla por partido y mandarlas a un 404
 * era peor. Desde T29 existe, así que las cuatro llevan ahí.
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
  torneoId: string | null = null,
): string | null {
  if (!entidadOrigenId) return null;

  if (entidadOrigenTipo === 'equipo') {
    if (tipo === 'team_invitation') return `/equipo/${entidadOrigenId}/invitacion`;
    if (tipo === 'team_join_requested' || tipo === 'roster_required') {
      return `/equipo/${entidadOrigenId}/gestionar`;
    }
    return `/equipo/${entidadOrigenId}`;
  }

  // La pantalla del partido cuelga del torneo, así que necesita los dos
  // ids. Los avisos viejos, guardados cuando no se registraba el
  // torneo, se quedan sin enlace en vez de armar una ruta inventada.
  if (entidadOrigenTipo === 'partido') {
    return torneoId ? `/torneo/${torneoId}/partido/${entidadOrigenId}` : null;
  }

  if (entidadOrigenTipo === 'torneo') {
    if (modo === 'organizador') return `/torneo/${entidadOrigenId}/gestionar`;
    if (tipo === 'registration_received') return `/torneo/${entidadOrigenId}/gestionar`;
    return `/torneo/${entidadOrigenId}`;
  }

  return null;
}
