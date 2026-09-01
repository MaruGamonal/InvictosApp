import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';
const TITULAR = '22222222-2222-2222-2222-222222222222';
const ADMIN = '33333333-3333-3333-3333-333333333333';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin' }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM organizacion WHERE id')) {
          return { rows: [{ usuario_titular_id: TITULAR }] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('quitarMiembro', () => {
  it('el titular quita a un administrador', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { quitarMiembro } = await import('./quitarMiembro');
    await expect(
      quitarMiembro({ organizacionId: ORG, usuarioId: ADMIN }, contextoCon('usuario-titular')),
    ).resolves.toEqual({ ok: true });
  });

  it('no se puede quitar al titular por esta vía', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { quitarMiembro } = await import('./quitarMiembro');
    await expect(
      quitarMiembro({ organizacionId: ORG, usuarioId: TITULAR }, contextoCon('usuario-titular')),
    ).rejects.toMatchObject({ codigo: 'ROL_TITULAR_NO_GESTIONABLE' });
  });

  it('un administrador no puede quitar a otro administrador', async () => {
    mockearDb({ rolEnOrganizacion: 'admin' });
    const { quitarMiembro } = await import('./quitarMiembro');
    await expect(
      quitarMiembro({ organizacionId: ORG, usuarioId: ADMIN }, contextoCon('usuario-admin')),
    ).rejects.toMatchObject({ codigo: 'ADMIN_NO_PUEDE_GESTIONAR_ADMINS' });
  });
});
