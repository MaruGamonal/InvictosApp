import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tiempoRelativo } from './tiempoRelativo';

const AHORA = new Date('2026-04-10T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('tiempoRelativo', () => {
  it('menos de un minuto: "recién"', () => {
    expect(tiempoRelativo(new Date(AHORA.getTime() - 30_000).toISOString())).toBe('recién');
  });

  it('minutos', () => {
    expect(tiempoRelativo(new Date(AHORA.getTime() - 5 * 60_000).toISOString())).toBe(
      'hace 5 min',
    );
  });

  it('horas', () => {
    expect(tiempoRelativo(new Date(AHORA.getTime() - 3 * 3_600_000).toISOString())).toBe(
      'hace 3 h',
    );
  });

  it('un día exacto usa singular', () => {
    expect(tiempoRelativo(new Date(AHORA.getTime() - 24 * 3_600_000).toISOString())).toBe(
      'hace 1 día',
    );
  });

  it('varios días usa plural', () => {
    expect(tiempoRelativo(new Date(AHORA.getTime() - 3 * 24 * 3_600_000).toISOString())).toBe(
      'hace 3 días',
    );
  });
});
