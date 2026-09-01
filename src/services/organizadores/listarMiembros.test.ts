import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin' }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM miembro_organizacion mo')) {
          return {
            rows: [
              {
                usuario_id: 'usuario-1',
                nombre_completo: 'Titular Uno',
                email: 't@example.com',
                rol: 'owner',
                estado: 'active',
              },
            ],
          };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('listarMiembros', () => {
  it('un miembro de la organización puede listar el equipo de trabajo', async () => {
    mockearDb({ rolEnOrganizacion: 'admin' });
    const { listarMiembros } = await import('./listarMiembros');
    const resultado = await listarMiembros({ organizacionId: ORG }, contextoCon('usuario-1'));
    expect(resultado).toEqual([
      {
        usuarioId: 'usuario-1',
        nombreCompleto: 'Titular Uno',
        email: 't@example.com',
        rol: 'owner',
        estado: 'active',
      },
    ]);
  });

  it('quien no es miembro no puede listar', async () => {
    mockearDb({});
    const { listarMiembros } = await import('./listarMiembros');
    await expect(
      listarMiembros({ organizacionId: ORG }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
