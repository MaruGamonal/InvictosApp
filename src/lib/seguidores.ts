/** "128 seguidores" / "1 seguidor" / "0 seguidores" — mismo formato en cualquier lugar que muestre este número. */
export function formatearCantidadSeguidores(cantidad: number): string {
  return `${cantidad.toLocaleString('es-AR')} ${cantidad === 1 ? 'seguidor' : 'seguidores'}`;
}
