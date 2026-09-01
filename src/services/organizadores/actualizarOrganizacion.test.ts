import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';

function mockearDb(rolEnOrganizacion: 'owner' | 'admin' | null, rowCountUpdate = 1) {
  const query = vi.fn(async (texto: string) => {
    const sql = texto.toUpperCase();
    if (sql.includes('FROM MIEMBRO_ORGANIZACION')) {
      return { rows: rolEnOrganizacion ? [{ rol: rolEnOrganizacion }] : [] };
    }
    if (sql.startsWith('UPDATE ORGANIZACION')) {
      return { rowCount: rowCountUpdate, rows: [] };
    }
    return { rows: [] };
  });
  vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
}

beforeEach(() => {
  vi.resetModules();
});

describe('actualizarOrganizacion', () => {
  it('el Administrador puede actualizar los datos públicos', async () => {
    mockearDb('admin');
    const { actualizarOrganizacion } = await import('./actualizarOrganizacion');
    await expect(
      actualizarOrganizacion(
        { organizacionId: ORG, nombre: 'Nuevo nombre' },
        contextoCon('admin-1'),
      ),
    ).resolves.toEqual({ id: ORG });
    vi.doUnmock('@/db/cliente');
  });

  it('sin ningún rol en la organización, se rechaza con SIN_PERMISO', async () => {
    mockearDb(null);
    const { actualizarOrganizacion } = await import('./actualizarOrganizacion');
    await expect(
      actualizarOrganizacion({ organizacionId: ORG, nombre: 'x' }, contextoCon('cualquiera')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    vi.doUnmock('@/db/cliente');
  });

  it('sin ningún campo para actualizar, DATOS_INVALIDOS', async () => {
    mockearDb('owner');
    const { actualizarOrganizacion } = await import('./actualizarOrganizacion');
    await expect(
      actualizarOrganizacion({ organizacionId: ORG }, contextoCon('titular')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    vi.doUnmock('@/db/cliente');
  });
});
