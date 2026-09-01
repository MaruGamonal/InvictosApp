/**
 * Catálogo de tipos de notificación (`04`, 4.12) con su categoría, que es
 * lo que decide la regla de canal (`06`, D-53, D-67): las **accionables**
 * van por dos canales —dentro del producto y email—; las **informativas**,
 * solo dentro del producto.
 */

export const TIPOS_NOTIFICACION = [
  'team_invitation',
  'team_join_requested',
  'team_join_resolved',
  'registration_received',
  'registration_resolved',
  'roster_required',
  'match_scheduled',
  'match_rescheduled',
  'result_pending_confirmation',
  'result_disputed',
  'tournament_published',
  'tournament_started',
  'tournament_finished',
  'tournament_cancelled',
  'tournament_rules_updated',
  'result_published',
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

const TIPOS_INFORMATIVOS = new Set<TipoNotificacion>([
  'tournament_published',
  'tournament_started',
  'tournament_finished',
  'result_published',
]);

export function esAccionable(tipo: TipoNotificacion): boolean {
  return !TIPOS_INFORMATIVOS.has(tipo);
}
