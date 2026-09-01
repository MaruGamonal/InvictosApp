/**
 * Liga: todos contra todos por el método del círculo. Sin criterios de
 * sorteo (`06`, D-31b) — el orden de entrada es el único insumo, y el
 * organizador edita la propuesta antes de confirmar si algo no le sirve.
 *
 * Con cantidad impar de equipos, se agrega un `BYE` interno: cada
 * equipo cae libre exactamente una vez en una vuelta completa, nunca
 * dos veces antes que otro (`02`, UC-29).
 */

const BYE = Symbol('bye');

export interface PartidoPropuesto {
  numeroFecha: number;
  equipoLocalId: string;
  equipoVisitanteId: string;
}

export function generarRoundRobin(equipoIds: string[], idaYVuelta: boolean): PartidoPropuesto[] {
  const equipos: Array<string | typeof BYE> = [...equipoIds];
  if (equipos.length % 2 !== 0) equipos.push(BYE);

  const n = equipos.length;
  const rondas = n - 1;
  const partidos: PartidoPropuesto[] = [];
  let arreglo = [...equipos];

  for (let ronda = 0; ronda < rondas; ronda += 1) {
    for (let i = 0; i < n / 2; i += 1) {
      const a = arreglo[i]!;
      const b = arreglo[n - 1 - i]!;
      if (a !== BYE && b !== BYE) {
        const [local, visitante] = ronda % 2 === 0 ? [a, b] : [b, a];
        partidos.push({
          numeroFecha: ronda + 1,
          equipoLocalId: local,
          equipoVisitanteId: visitante,
        });
      }
    }
    const fijo = arreglo[0]!;
    const resto = arreglo.slice(1);
    resto.unshift(resto.pop()!);
    arreglo = [fijo, ...resto];
  }

  if (idaYVuelta) {
    const vuelta = partidos.map((p) => ({
      numeroFecha: p.numeroFecha + rondas,
      equipoLocalId: p.equipoVisitanteId,
      equipoVisitanteId: p.equipoLocalId,
    }));
    partidos.push(...vuelta);
  }

  return partidos;
}
