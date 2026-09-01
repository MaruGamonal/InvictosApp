import { describe, expect, it } from 'vitest';
import { generarRoundRobin } from './_roundRobin';

describe('generarRoundRobin', () => {
  it('con 8 equipos: 7 fechas de 4 partidos cada una', () => {
    const equipos = Array.from({ length: 8 }, (_, i) => `equipo-${i + 1}`);
    const partidos = generarRoundRobin(equipos, false);

    const fechas = new Map<number, number>();
    for (const p of partidos) fechas.set(p.numeroFecha, (fechas.get(p.numeroFecha) ?? 0) + 1);

    expect(fechas.size).toBe(7);
    for (const cantidad of fechas.values()) expect(cantidad).toBe(4);
  });

  it('cada par de equipos se enfrenta exactamente una vez (ida)', () => {
    const equipos = ['A', 'B', 'C', 'D'];
    const partidos = generarRoundRobin(equipos, false);
    const pares = partidos.map((p) => [p.equipoLocalId, p.equipoVisitanteId].sort().join('-'));
    expect(new Set(pares).size).toBe(pares.length);
    expect(pares.length).toBe(6); // C(4,2)
  });

  it('ida y vuelta duplica los partidos, con localía invertida', () => {
    const equipos = ['A', 'B', 'C', 'D'];
    const soloIda = generarRoundRobin(equipos, false);
    const idaYVuelta = generarRoundRobin(equipos, true);
    expect(idaYVuelta.length).toBe(soloIda.length * 2);
  });

  it('con 9 equipos, cada fecha deja exactamente un equipo libre y nadie libra dos veces antes que otro', () => {
    const equipos = Array.from({ length: 9 }, (_, i) => `equipo-${i + 1}`);
    const partidos = generarRoundRobin(equipos, false);

    const libresPorFecha = new Map<number, Set<string>>();
    for (let fecha = 1; fecha <= 9; fecha += 1) {
      const jugaron = new Set(
        partidos
          .filter((p) => p.numeroFecha === fecha)
          .flatMap((p) => [p.equipoLocalId, p.equipoVisitanteId]),
      );
      const libres = equipos.filter((e) => !jugaron.has(e));
      expect(libres).toHaveLength(1);
      libresPorFecha.set(fecha, new Set(libres));
    }

    const vecesLibre = new Map<string, number>();
    for (const libres of libresPorFecha.values()) {
      for (const equipo of libres) vecesLibre.set(equipo, (vecesLibre.get(equipo) ?? 0) + 1);
    }
    for (const veces of vecesLibre.values()) expect(veces).toBe(1);
  });
});
