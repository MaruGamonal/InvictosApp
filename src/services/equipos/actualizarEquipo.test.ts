import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  rowCountUpdate?: number;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.startsWith('UPDATE equipo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('actualizarEquipo', () => {
  it('el capitán puede actualizar los datos de identidad', async () => {
    mockearDb({ perfilId: '22222222-2222-2222-2222-222222222222', rolesEnEquipo: ['captain'] });
    const { actualizarEquipo } = await import('./actualizarEquipo');
    await expect(
      actualizarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111', nombre: 'Nuevo Nombre FC' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ id: '11111111-1111-1111-1111-111111111111' });
  });

  it('el delegado también puede actualizar', async () => {
    mockearDb({ perfilId: '33333333-3333-3333-3333-333333333333', rolesEnEquipo: ['delegate'] });
    const { actualizarEquipo } = await import('./actualizarEquipo');
    await expect(
      actualizarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111', colores: 'rojo y blanco' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ id: '11111111-1111-1111-1111-111111111111' });
  });

  it('un jugador sin más roles no puede actualizar el equipo', async () => {
    mockearDb({ perfilId: '55555555-5555-5555-5555-555555555555', rolesEnEquipo: ['player'] });
    const { actualizarEquipo } = await import('./actualizarEquipo');
    await expect(
      actualizarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111', nombre: 'X' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin ningún dato para actualizar, DATOS_INVALIDOS', async () => {
    mockearDb({ perfilId: '22222222-2222-2222-2222-222222222222', rolesEnEquipo: ['captain'] });
    const { actualizarEquipo } = await import('./actualizarEquipo');
    await expect(
      actualizarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { actualizarEquipo } = await import('./actualizarEquipo');
    await expect(
      actualizarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111', nombre: 'X' },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
