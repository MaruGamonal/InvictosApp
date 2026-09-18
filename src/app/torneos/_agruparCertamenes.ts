import type { TorneoBuscado } from '@/services/descubrimiento/buscarTorneos';

/**
 * `06`, D-107 — agrupamiento **de presentación, no de consulta**:
 * `buscarTorneos` sigue devolviendo torneos, con los mismos filtros, el
 * mismo orden y la misma paginación (`_datos.ts`); esta función solo
 * junta, dentro de la página ya traída, las filas **contiguas** que
 * comparten `certamenId`. Si el corte de página cae en el medio de un
 * certamen, el bloque se parte entre dos páginas — limitación aceptada
 * y explícita (`06`, D-107): la parte de la página siguiente arma su
 * propio bloque y repite el encabezado del certamen.
 */
export type BloqueDescubrimiento =
  | { tipo: 'torneo'; torneo: TorneoBuscado }
  | { tipo: 'certamen'; certamenId: string; certamenNombre: string; torneos: TorneoBuscado[] };

export function agruparCertamenesContiguos(torneos: TorneoBuscado[]): BloqueDescubrimiento[] {
  const bloques: BloqueDescubrimiento[] = [];

  for (const torneo of torneos) {
    const ultimo = bloques.at(-1);
    if (
      torneo.certamenId &&
      ultimo?.tipo === 'certamen' &&
      ultimo.certamenId === torneo.certamenId
    ) {
      ultimo.torneos.push(torneo);
      continue;
    }
    if (torneo.certamenId) {
      bloques.push({
        tipo: 'certamen',
        certamenId: torneo.certamenId,
        certamenNombre: torneo.certamenNombre ?? '',
        torneos: [torneo],
      });
    } else {
      bloques.push({ tipo: 'torneo', torneo });
    }
  }

  return bloques;
}
