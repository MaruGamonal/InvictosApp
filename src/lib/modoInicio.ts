export const NOMBRE_COOKIE_MODO_INICIO = 'modo_inicio';
export const DURACION_MODO_INICIO_SEGUNDOS = 60 * 60 * 24 * 365;

export type ModoInicio = 'jugador' | 'organizador';

export function comoModoInicio(valor: string | undefined): ModoInicio | null {
  return valor === 'jugador' || valor === 'organizador' ? valor : null;
}
