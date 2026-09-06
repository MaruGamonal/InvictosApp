/**
 * El nombre del producto, en un solo lugar (`06`, D-84 / revisión 15,
 * sección 3.6 de `LEEME.md`). La marca no es registrable —hay una
 * "I INVICTA" viva en clase 9, Invicta S.p.A. (`06`, D-97)—, así que el
 * nombre puede tener que revisarse antes de formalizar si el test de
 * mercado funciona. Concentrarlo acá convierte ese eventual cambio en
 * una línea, en vez de una migración por los metadatos, el manifiesto
 * de la PWA, los títulos de página y los correos.
 */
export const NOMBRE_PRODUCTO = 'INVICTA';

/** El sufijo estándar de `<title>` en las superficies públicas: "Algo — INVICTA". */
export function conNombreProducto(titulo?: string): string {
  return titulo ? `${titulo} — ${NOMBRE_PRODUCTO}` : NOMBRE_PRODUCTO;
}
