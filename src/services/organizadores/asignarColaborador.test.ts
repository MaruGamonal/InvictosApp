import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const COLABORADOR = '33333333-3333-3333-3333-333333333333';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin' }) {
  const inserts: unknown[][] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        if (texto.includes('FROM torneo WHERE id')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.trim().startsWith('INSERT INTO colaborador_torneo')) {
          inserts.push(valores);
          return { rows: [] };
        }
        return { rows: [] };
      },
    }),
  }));
  return inserts;
}

describe('asignarColaborador', () => {
  it('el titular asigna un colaborador al torneo', async () => {
    const inserts = mockearDb({ rolEnOrganizacion: 'owner' });
    const { asignarColaborador } = await import('./asignarColaborador');
    const resultado = await asignarColaborador(
      { torneoId: TORNEO, usuarioId: COLABORADOR },
      contextoCon('usuario-titular'),
    );
    expect(resultado).toEqual({ estado: 'active' });
    expect(inserts).toHaveLength(1);
  });

  it('un administrador también puede asignar colaboradores (D-64)', async () => {
    mockearDb({ rolEnOrganizacion: 'admin' });
    const { asignarColaborador } = await import('./asignarColaborador');
    await expect(
      asignarColaborador(
        { torneoId: TORNEO, usuarioId: COLABORADOR },
        contextoCon('usuario-admin'),
      ),
    ).resolves.toEqual({ estado: 'active' });
  });

  it('un colaborador no puede asignar a otro colaborador', async () => {
    mockearDb({});
    const { asignarColaborador } = await import('./asignarColaborador');
    await expect(
      asignarColaborador({ torneoId: TORNEO, usuarioId: COLABORADOR }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
