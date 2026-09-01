import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  usuarioExistente?: { id: string; estado: string } | null;
}) {
  const inserts: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM usuario WHERE email')) {
          return { rows: opciones.usuarioExistente ? [opciones.usuarioExistente] : [] };
        }
        if (
          texto.trim().startsWith('INSERT INTO usuario') ||
          texto.trim().startsWith('INSERT INTO miembro_organizacion')
        ) {
          inserts.push(texto.trim());
          return { rows: [] };
        }
        return { rows: [] };
      },
    }),
  }));
  return inserts;
}

describe('invitarMiembro', () => {
  it('el titular invita a alguien sin cuenta: se crea en invited y se manda el enlace', async () => {
    const inserts = mockearDb({ rolEnOrganizacion: 'owner', usuarioExistente: null });
    const inviteUserByEmail = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'usuario-nuevo' } }, error: null });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail } } }),
    }));

    const { invitarMiembro } = await import('./invitarMiembro');
    const resultado = await invitarMiembro(
      { organizacionId: ORG, email: 'nuevo@example.com', nombreCompleto: 'Nuevo Admin' },
      contextoCon('usuario-titular'),
    );

    expect(resultado).toEqual({ usuarioId: 'usuario-nuevo', rol: 'admin' });
    expect(inviteUserByEmail).toHaveBeenCalledWith('nuevo@example.com', expect.anything());
    expect(inserts.some((i) => i.startsWith('INSERT INTO usuario'))).toBe(true);
    expect(inserts.some((i) => i.startsWith('INSERT INTO miembro_organizacion'))).toBe(true);
  });

  it('sin nombreCompleto para alguien nuevo, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', usuarioExistente: null });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail: vi.fn() } } }),
    }));
    const { invitarMiembro } = await import('./invitarMiembro');
    await expect(
      invitarMiembro(
        { organizacionId: ORG, email: 'nuevo@example.com' },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('invitar a alguien que ya tiene cuenta activa solo confirma el vínculo, sin reenviar nada', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      usuarioExistente: { id: 'usuario-existente', estado: 'active' },
    });
    const inviteUserByEmail = vi.fn();
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail } } }),
    }));

    const { invitarMiembro } = await import('./invitarMiembro');
    const resultado = await invitarMiembro(
      { organizacionId: ORG, email: 'existente@example.com' },
      contextoCon('usuario-titular'),
    );

    expect(resultado).toEqual({ usuarioId: 'usuario-existente', rol: 'admin' });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('invitar de nuevo a alguien todavía invited reenvía el acceso', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      usuarioExistente: { id: 'usuario-invitado', estado: 'invited' },
    });
    const inviteUserByEmail = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'usuario-invitado' } }, error: null });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail } } }),
    }));

    const { invitarMiembro } = await import('./invitarMiembro');
    await invitarMiembro(
      { organizacionId: ORG, email: 'invitado@example.com' },
      contextoCon('usuario-titular'),
    );

    expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
  });

  it('un administrador no puede invitar a otro administrador', async () => {
    mockearDb({ rolEnOrganizacion: 'admin' });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail: vi.fn() } } }),
    }));
    const { invitarMiembro } = await import('./invitarMiembro');
    await expect(
      invitarMiembro(
        { organizacionId: ORG, email: 'x@example.com', nombreCompleto: 'X' },
        contextoCon('usuario-admin'),
      ),
    ).rejects.toMatchObject({ codigo: 'ADMIN_NO_PUEDE_GESTIONAR_ADMINS' });
  });
});
