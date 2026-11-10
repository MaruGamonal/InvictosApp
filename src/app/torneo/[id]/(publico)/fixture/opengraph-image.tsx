import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { dibujarImagenDelTorneo, TAMANO } from '../_imagenParaCompartir';

/** La imagen al compartir el link del fixture (ver `_imagenParaCompartir.tsx`). */
export const alt = `Torneo en ${NOMBRE_PRODUCTO}`;
export const size = TAMANO;
export const contentType = 'image/png';

export default async function Imagen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return dibujarImagenDelTorneo(id);
}
