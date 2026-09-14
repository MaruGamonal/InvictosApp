import type { TipoNotificacion } from './tipos';

/**
 * UC-47 (diseño D11) — categorías de preferencia: más anchas que
 * `notificacion.tipo` (16 valores), pensadas para que la pantalla de
 * Preferencias quepa sin abrumar. No cubre los 16 tipos: los que no
 * mapean acá (`team_join_requested`, `roster_required`,
 * `result_pending_confirmation`, etc.) siguen la regla global de D-53
 * sin que el usuario pueda tocarlos todavía — el diseño aprobado
 * muestra exactamente estas seis, no las dieciséis.
 */
export const CATEGORIAS_PREFERENCIA = [
  'team_invitation',
  'registration_status',
  'match_schedule',
  'followed_results',
  'tournament_started',
  'tournament_finished',
] as const;
export type CategoriaPreferencia = (typeof CATEGORIAS_PREFERENCIA)[number];

const CATEGORIA_POR_TIPO: Partial<Record<TipoNotificacion, CategoriaPreferencia>> = {
  team_invitation: 'team_invitation',
  registration_received: 'registration_status',
  registration_resolved: 'registration_status',
  match_scheduled: 'match_schedule',
  match_rescheduled: 'match_schedule',
  result_published: 'followed_results',
  tournament_started: 'tournament_started',
  tournament_finished: 'tournament_finished',
};

export function categoriaDePreferencia(tipo: TipoNotificacion): CategoriaPreferencia | null {
  return CATEGORIA_POR_TIPO[tipo] ?? null;
}

/**
 * Accionables (`06`, D-53): van por los dos canales y el diseño no deja
 * apagar `in_app` del todo — solo elegir si además llega por email.
 * Las que no están acá son informativas: van solo por `in_app`, y ese
 * es el único canal que tiene sentido apagar.
 */
export const CATEGORIAS_ACCIONABLES = new Set<CategoriaPreferencia>([
  'team_invitation',
  'registration_status',
  'match_schedule',
]);
