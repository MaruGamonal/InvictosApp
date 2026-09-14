import { describe, expect, it } from 'vitest';
import { calcularDuracionTorneo, esTorneoRelampago, etiquetaDuracionTorneo } from './duracionTorneo';

describe('calcularDuracionTorneo', () => {
  it('mismo día es single_day', () => {
    expect(calcularDuracionTorneo('2026-09-06T09:00:00Z', '2026-09-06T22:00:00Z')).toBe(
      'single_day',
    );
  });

  it('fin antes que inicio (dato inconsistente) no revienta: se trata como single_day', () => {
    expect(calcularDuracionTorneo('2026-09-06T00:00:00Z', '2026-09-05T00:00:00Z')).toBe(
      'single_day',
    );
  });

  it('ventana de 2 o 3 días es weekend', () => {
    expect(calcularDuracionTorneo('2026-09-05T00:00:00Z', '2026-09-06T00:00:00Z')).toBe('weekend');
    expect(calcularDuracionTorneo('2026-09-05T00:00:00Z', '2026-09-07T00:00:00Z')).toBe('weekend');
  });

  it('más de 3 días es extended', () => {
    expect(calcularDuracionTorneo('2026-09-01T00:00:00Z', '2026-09-08T00:00:00Z')).toBe(
      'extended',
    );
  });

  it('sin alguna de las dos fechas, no se clasifica', () => {
    expect(calcularDuracionTorneo(null, '2026-09-06T00:00:00Z')).toBeNull();
    expect(calcularDuracionTorneo('2026-09-06T00:00:00Z', null)).toBeNull();
    expect(calcularDuracionTorneo(null, null)).toBeNull();
  });
});

describe('esTorneoRelampago', () => {
  it('single_day y weekend son relámpago; extended y null no', () => {
    expect(esTorneoRelampago('single_day')).toBe(true);
    expect(esTorneoRelampago('weekend')).toBe(true);
    expect(esTorneoRelampago('extended')).toBe(false);
    expect(esTorneoRelampago(null)).toBe(false);
  });
});

describe('etiquetaDuracionTorneo', () => {
  it('devuelve la etiqueta visible de cada valor', () => {
    expect(etiquetaDuracionTorneo('single_day')).toBe('Un día');
    expect(etiquetaDuracionTorneo('weekend')).toBe('Fin de semana');
    expect(etiquetaDuracionTorneo('extended')).toBe('Liga extendida');
  });
});
