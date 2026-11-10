/**
 * Para comparar texto de búsqueda sin mayúsculas ni tildes: el catálogo
 * de ciudades (D-88) está lleno de "Chascomús", "Cañuelas", "Córdoba", y
 * nadie las escribe con tilde en el teléfono. La eñe se iguala a la ene
 * por lo mismo.
 *
 * Puro y sin dependencias: lo usan componentes de cliente.
 */
export function normalizarParaBuscar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
