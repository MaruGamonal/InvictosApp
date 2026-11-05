import { describe, expect, it } from 'vitest';
import { normalizarParaBuscar } from './normalizarParaBuscar';

describe('normalizarParaBuscar', () => {
  it('ignora tildes, eñes, mayúsculas y espacios de los bordes', () => {
    expect(normalizarParaBuscar('  Chascomús ')).toBe('chascomus');
    expect(normalizarParaBuscar('CAÑUELAS')).toBe('canuelas');
    expect(normalizarParaBuscar('Córdoba')).toBe(normalizarParaBuscar('cordoba'));
  });
});
