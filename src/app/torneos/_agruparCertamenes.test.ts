import { describe, expect, it } from 'vitest';
import type { TorneoBuscado } from '@/services/descubrimiento/buscarTorneos';
import { agruparCertamenesContiguos } from './_agruparCertamenes';

function torneo(id: string, over: Partial<TorneoBuscado> = {}): TorneoBuscado {
  return {
    id,
    nombre: `Torneo ${id}`,
    imagenUrl: null,
    modalidad: 'f5',
    categoriaGenero: 'mixed',
    categoriaEdad: 'open',
    estado: 'registration_open',
    fechaInicioEstimada: null,
    duracion: null,
    cupoEquipos: 16,
    inscriptosAprobados: 0,
    organizacionNombre: 'Organización',
    organizacionVerificada: false,
    certamenId: null,
    certamenNombre: null,
    division: null,
    ...over,
  };
}

describe('agruparCertamenesContiguos', () => {
  it('un torneo sin certamen queda como bloque suelto', () => {
    const bloques = agruparCertamenesContiguos([torneo('t1')]);
    expect(bloques).toEqual([{ tipo: 'torneo', torneo: torneo('t1') }]);
  });

  it('divisiones contiguas del mismo certamen se juntan en un solo bloque', () => {
    const a = torneo('a', { certamenId: 'cert-1', certamenNombre: 'Apertura 2026', division: 'A' });
    const b = torneo('b', { certamenId: 'cert-1', certamenNombre: 'Apertura 2026', division: 'B' });

    const bloques = agruparCertamenesContiguos([a, b]);

    expect(bloques).toEqual([
      { tipo: 'certamen', certamenId: 'cert-1', certamenNombre: 'Apertura 2026', torneos: [a, b] },
    ]);
  });

  it('divisiones del mismo certamen separadas por un torneo suelto no se juntan (no contiguas)', () => {
    const a = torneo('a', { certamenId: 'cert-1', certamenNombre: 'Apertura', division: 'A' });
    const suelto = torneo('suelto');
    const b = torneo('b', { certamenId: 'cert-1', certamenNombre: 'Apertura', division: 'B' });

    const bloques = agruparCertamenesContiguos([a, suelto, b]);

    expect(bloques).toEqual([
      { tipo: 'certamen', certamenId: 'cert-1', certamenNombre: 'Apertura', torneos: [a] },
      { tipo: 'torneo', torneo: suelto },
      { tipo: 'certamen', certamenId: 'cert-1', certamenNombre: 'Apertura', torneos: [b] },
    ]);
  });

  it('certámenes distintos contiguos quedan en bloques separados', () => {
    const a = torneo('a', { certamenId: 'cert-1', certamenNombre: 'Apertura', division: 'A' });
    const b = torneo('b', { certamenId: 'cert-2', certamenNombre: 'Clausura', division: 'A' });

    const bloques = agruparCertamenesContiguos([a, b]);

    expect(bloques).toEqual([
      { tipo: 'certamen', certamenId: 'cert-1', certamenNombre: 'Apertura', torneos: [a] },
      { tipo: 'certamen', certamenId: 'cert-2', certamenNombre: 'Clausura', torneos: [b] },
    ]);
  });

  it('una sola división en el borde de la página igual arma un bloque de certamen (repite encabezado, D-107)', () => {
    const a = torneo('a', { certamenId: 'cert-1', certamenNombre: 'Apertura', division: 'C' });

    const bloques = agruparCertamenesContiguos([a]);

    expect(bloques).toEqual([
      { tipo: 'certamen', certamenId: 'cert-1', certamenNombre: 'Apertura', torneos: [a] },
    ]);
  });
});
