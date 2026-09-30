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

/**
 * **El correo de producto está apagado, a propósito y por ahora.**
 *
 * Hoy el único correo que sale del producto es el de la cuenta —confirmar
 * el alta, recuperar la contraseña, verificar una organización,
 * invitar—, y ese lo arma y lo manda Supabase Auth con sus plantillas,
 * sin pasar por acá. Ningún aviso de producto va por mail: todos viven
 * dentro de la aplicación.
 *
 * Lo que decidió apagarlo no fue un problema técnico —el despacho está
 * construido, probado y listo en `_despachoDeCorreo.ts`— sino la
 * decisión de no llenarle la casilla a nadie mientras el producto se
 * estrena. Un remitente que manda de más se filtra entero, y con eso se
 * pierden también los correos de la cuenta, que son los que no se
 * pueden perder.
 *
 * **Para volver a prenderlo** alcanza con poner esto en `true` y volver
 * a agendar la tarea `despachar-correos` (hay una migración que la
 * desagendó, y su `down` la vuelve a poner). Las preferencias de email
 * que alguien haya guardado siguen en la base y se respetan desde el
 * primer envío.
 */
export const CORREO_DE_PRODUCTO_ACTIVO = false;

/**
 * Por qué canales sale un aviso (`06`, D-53). Es el único lugar que lo
 * decide: `notificar()` no arma la lista por su cuenta.
 */
export function canalesDe(tipo: TipoNotificacion): Array<'in_app' | 'email'> {
  if (!CORREO_DE_PRODUCTO_ACTIVO) return ['in_app'];
  return esAccionable(tipo) ? ['in_app', 'email'] : ['in_app'];
}
