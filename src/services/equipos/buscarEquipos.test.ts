import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

beforeEach(() => vi.resetModules());

function filaEquipo(id: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    nombre: `Equipo ${id}`,
    escudo_url: null,
    categoria_genero: 'male',
    modalidad_habitual: 'f5',
    ciudad_nombre: 'La Plata',
    ...over,
  };
}

function mockearDb(opciones: { equipos?: ReturnType<typeof filaEquipo>[] }) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto: texto.trim(), valores });
        return { rows: opciones.equipos ?? [] };
      },
    }),
  }));
  return consultas;
}

describe('buscarEquipos', () => {
  it('solo pide equipos activos, sin filtros', async () => {
    const consultas = mockearDb({ equipos: [filaEquipo('e1')] });
    const { buscarEquipos } = await import('./buscarEquipos');

    const resultado = await buscarEquipos({}, VISITANTE);

    expect(resultado.equipos).toEqual([
      {
        id: 'e1',
        nombre: 'Equipo e1',
        escudoUrl: null,
        categoriaGenero: 'male',
        modalidadHabitual: 'f5',
        ciudad: 'La Plata',
      },
    ]);
    expect(consultas[0]!.texto).toContain("e.estado = 'active'");
    expect(consultas[0]!.valores).toEqual([]);
  });

  it('filtra por texto, ciudad, modalidad y categoría de género', async () => {
    const consultas = mockearDb({ equipos: [] });
    const { buscarEquipos } = await import('./buscarEquipos');

    await buscarEquipos(
      {
        texto: 'Pibes',
        ciudadId: '11111111-1111-1111-1111-111111111111',
        modalidad: 'f7',
        categoriaGenero: 'female',
      },
      VISITANTE,
    );

    expect(consultas[0]!.texto).toContain('e.nombre ILIKE');
    expect(consultas[0]!.texto).toContain('e.ciudad_id');
    expect(consultas[0]!.texto).toContain('e.modalidad_habitual');
    expect(consultas[0]!.texto).toContain('e.categoria_genero');
    expect(consultas[0]!.valores).toEqual([
      '%Pibes%',
      '11111111-1111-1111-1111-111111111111',
      'f7',
      'female',
    ]);
  });

  it('pagina por cursor (nombre, id)', async () => {
    mockearDb({
      equipos: [filaEquipo('e1', { nombre: 'A' }), filaEquipo('e2', { nombre: 'B' })],
    });
    const { buscarEquipos } = await import('./buscarEquipos');

    const resultado = await buscarEquipos({ tamanoPagina: 1 }, VISITANTE);

    expect(resultado.equipos).toHaveLength(1);
    expect(resultado.equipos[0]!.id).toBe('e1');
    expect(resultado.cursorSiguiente).not.toBeNull();
  });
});
