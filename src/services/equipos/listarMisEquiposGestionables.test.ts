import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string;
  equipoIds?: string[];
  equipos?: { id: string; nombre: string; escudo_url: string | null; categoria_genero: string }[];
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (sql.includes('DISTINCT equipo_id')) {
          return { rows: (opciones.equipoIds ?? []).map((equipo_id) => ({ equipo_id })) };
        }
        return { rows: opciones.equipos ?? [] };
      },
    }),
  }));
}

describe('listarMisEquiposGestionables', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { listarMisEquiposGestionables } = await import('./listarMisEquiposGestionables');
    await expect(listarMisEquiposGestionables(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('con sesión pero sin perfil deportivo, lista vacía', async () => {
    mockearDb({});
    const { listarMisEquiposGestionables } = await import('./listarMisEquiposGestionables');
    const resultado = await listarMisEquiposGestionables(undefined, contextoCon('usuario-1'));
    expect(resultado).toEqual([]);
  });

  it('sin equipos donde sea capitana o delegada, lista vacía', async () => {
    mockearDb({ perfilId: 'perfil-1', equipoIds: [] });
    const { listarMisEquiposGestionables } = await import('./listarMisEquiposGestionables');
    const resultado = await listarMisEquiposGestionables(undefined, contextoCon('usuario-1'));
    expect(resultado).toEqual([]);
  });

  it('devuelve los equipos donde tiene rol de gestión', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      equipoIds: ['equipo-1'],
      equipos: [
        { id: 'equipo-1', nombre: 'Los Pibes', escudo_url: null, categoria_genero: 'male' },
      ],
    });
    const { listarMisEquiposGestionables } = await import('./listarMisEquiposGestionables');
    const resultado = await listarMisEquiposGestionables(undefined, contextoCon('usuario-1'));
    expect(resultado).toEqual([
      { id: 'equipo-1', nombre: 'Los Pibes', escudoUrl: null, categoriaGenero: 'male' },
    ]);
  });
});
