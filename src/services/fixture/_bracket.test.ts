import { describe, expect, it } from 'vitest';
import { generarPrimeraRondaBracket, generarSiguienteRondaBracket } from './_bracket';

describe('generarPrimeraRondaBracket', () => {
  it('empareja 1º contra último, 2º contra anteúltimo', () => {
    const partidos = generarPrimeraRondaBracket(['A', 'B', 'C', 'D']);
    expect(partidos).toEqual([
      { numeroFecha: 1, equipoLocalId: 'A', equipoVisitanteId: 'D' },
      { numeroFecha: 1, equipoLocalId: 'B', equipoVisitanteId: 'C' },
    ]);
  });

  it('rechaza una cantidad que no es potencia de 2', () => {
    expect(() => generarPrimeraRondaBracket(['A', 'B', 'C'])).toThrow();
  });

  it('acepta 8 equipos (potencia de 2) sin problema', () => {
    const equipos = Array.from({ length: 8 }, (_, i) => `equipo-${i + 1}`);
    expect(generarPrimeraRondaBracket(equipos)).toHaveLength(4);
  });
});

describe('generarSiguienteRondaBracket', () => {
  it('empareja a los ganadores en el orden en que llegaron', () => {
    const partidos = generarSiguienteRondaBracket(['A', 'B', 'C', 'D'], 2);
    expect(partidos).toEqual([
      { numeroFecha: 2, equipoLocalId: 'A', equipoVisitanteId: 'B' },
      { numeroFecha: 2, equipoLocalId: 'C', equipoVisitanteId: 'D' },
    ]);
  });

  it('rechaza una cantidad impar de ganadores', () => {
    expect(() => generarSiguienteRondaBracket(['A', 'B', 'C'], 2)).toThrow();
  });
});
