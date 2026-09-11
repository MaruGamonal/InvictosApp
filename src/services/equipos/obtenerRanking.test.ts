import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };
const EQUIPO = '11111111-1111-1111-1111-111111111111';
const CIUDAD = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  equipo?: Record<string, unknown> | null;
  ranking?: Array<{ id: string; nombre: string; escudo_url: string | null; valor: string }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT e.ciudad_id, c.nombre')) {
          const equipo =
            opciones.equipo === undefined
              ? {
                  ciudad_id: CIUDAD,
                  ciudad_nombre: 'San Isidro',
                  modalidad_habitual: 'f5',
                  categoria_genero: 'male',
                }
              : opciones.equipo;
          return { rows: equipo ? [equipo] : [] };
        }
        if (t.startsWith('SELECT e.id, e.nombre, e.escudo_url, se.valor')) {
          return { rows: opciones.ranking ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerRanking', () => {
  it('equipo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ equipo: null });
    const { obtenerRanking } = await import('./obtenerRanking');
    await expect(obtenerRanking({ equipoId: EQUIPO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('sin ciudad definida, no disponible', async () => {
    mockearDb({
      equipo: { ciudad_id: null, ciudad_nombre: null, modalidad_habitual: 'f5', categoria_genero: 'male' },
    });
    const { obtenerRanking } = await import('./obtenerRanking');
    const resultado = await obtenerRanking({ equipoId: EQUIPO }, VISITANTE);
    expect(resultado).toEqual({ disponible: false });
  });

  it('sin modalidad definida, no disponible', async () => {
    mockearDb({
      equipo: {
        ciudad_id: CIUDAD,
        ciudad_nombre: 'San Isidro',
        modalidad_habitual: null,
        categoria_genero: 'male',
      },
    });
    const { obtenerRanking } = await import('./obtenerRanking');
    const resultado = await obtenerRanking({ equipoId: EQUIPO }, VISITANTE);
    expect(resultado).toEqual({ disponible: false });
  });

  it('con ciudad y modalidad, devuelve el ranking ordenado y marca al equipo propio', async () => {
    mockearDb({
      ranking: [
        { id: 'eq-otro', nombre: 'Deportivo Belgrano', escudo_url: null, valor: '81' },
        { id: EQUIPO, nombre: 'Los Pibes del Fondo', escudo_url: null, valor: '78' },
      ],
    });
    const { obtenerRanking } = await import('./obtenerRanking');
    const resultado = await obtenerRanking({ equipoId: EQUIPO }, VISITANTE);

    expect(resultado).toEqual({
      disponible: true,
      ciudadNombre: 'San Isidro',
      modalidad: 'f5',
      categoriaGenero: 'male',
      equipos: [
        { equipoId: 'eq-otro', nombre: 'Deportivo Belgrano', escudoUrl: null, valor: 81, esElEquipoActual: false },
        {
          equipoId: EQUIPO,
          nombre: 'Los Pibes del Fondo',
          escudoUrl: null,
          valor: 78,
          esElEquipoActual: true,
        },
      ],
    });
  });
});
