import { describe, expect, it } from 'vitest';
import { obtenerEtiqueta } from './etiquetas';

describe('obtenerEtiqueta', () => {
  it('devuelve la etiqueta y el color exactos de `04`', () => {
    expect(obtenerEtiqueta('torneo.estado', 'registration_open')).toEqual({
      etiqueta: 'Inscripciones abiertas',
      color: 'exito',
    });
  });

  it('finished es neutro, no éxito — un torneo terminado no es un logro (`04`, sección 6)', () => {
    expect(obtenerEtiqueta('torneo.estado', 'finished').color).toBe('neutro');
  });

  it('unverified es neutro, no advertencia — nace así toda organización (`04`, sección 6)', () => {
    expect(obtenerEtiqueta('organizacion.nivelVerificacion', 'unverified').color).toBe('neutro');
  });

  it('walkover se distingue de played a simple vista (colores distintos)', () => {
    expect(obtenerEtiqueta('partido.estado', 'played').color).toBe('exito');
    expect(obtenerEtiqueta('partido.estado', 'walkover').color).toBe('advertencia');
  });

  it('lanza si se pide un valor que no está dado de alta en el catálogo', () => {
    expect(() => obtenerEtiqueta('torneo.estado', 'no_existe')).toThrow();
  });
});
