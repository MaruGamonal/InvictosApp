import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

function mockearDb(
  filas: {
    provincia_id: string;
    provincia_nombre: string;
    ciudad_id: string;
    ciudad_nombre: string;
    cantidad_torneos: string;
  }[],
) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto: texto.trim(), valores });
        return { rows: filas };
      },
    }),
  }));
  return consultas;
}

beforeEach(() => vi.resetModules());

describe('listarCiudades', () => {
  it('agrupa las ciudades por provincia', async () => {
    mockearDb([
      {
        provincia_id: 'p1',
        provincia_nombre: 'Buenos Aires',
        ciudad_id: 'c1',
        ciudad_nombre: 'La Plata',
        cantidad_torneos: '3',
      },
      {
        provincia_id: 'p1',
        provincia_nombre: 'Buenos Aires',
        ciudad_id: 'c2',
        ciudad_nombre: 'Mar del Plata',
        cantidad_torneos: '0',
      },
      {
        provincia_id: 'p2',
        provincia_nombre: 'Córdoba',
        ciudad_id: 'c3',
        ciudad_nombre: 'Córdoba Capital',
        cantidad_torneos: '1',
      },
    ]);
    const { listarCiudades } = await import('./listarCiudades');

    const provincias = await listarCiudades({}, VISITANTE);

    expect(provincias).toEqual([
      {
        id: 'p1',
        nombre: 'Buenos Aires',
        ciudades: [
          { id: 'c1', nombre: 'La Plata', cantidadTorneos: 3 },
          { id: 'c2', nombre: 'Mar del Plata', cantidadTorneos: 0 },
        ],
      },
      {
        id: 'p2',
        nombre: 'Córdoba',
        ciudades: [{ id: 'c3', nombre: 'Córdoba Capital', cantidadTorneos: 1 }],
      },
    ]);
  });

  it('pasa la búsqueda como filtro ILIKE sobre el nombre de la ciudad', async () => {
    const consultas = mockearDb([]);
    const { listarCiudades } = await import('./listarCiudades');

    await listarCiudades({ busqueda: 'plata' }, VISITANTE);

    expect(consultas[0]!.texto).toContain('c.nombre ILIKE $2');
    expect(consultas[0]!.valores).toContain('%plata%');
  });

  it('sin búsqueda, lista el catálogo completo', async () => {
    const consultas = mockearDb([]);
    const { listarCiudades } = await import('./listarCiudades');

    await listarCiudades({}, VISITANTE);

    expect(consultas[0]!.texto).not.toContain('ILIKE');
  });
});
