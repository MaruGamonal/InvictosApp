import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  usuarioExistente?: { id: string; estado: string } | null;
}) {
  const inserts: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM torneo WHERE id')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.includes('FROM usuario WHERE email')) {
          return { rows: opciones.usuarioExistente ? [opciones.usuarioExistente] : [] };
        }
        if (
          texto.trim().startsWith('INSERT INTO usuario') ||
          texto.trim().startsWith('INSERT INTO colaborador_torneo')
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

describe('invitarColaborador', () => {
  it('el titular invita a alguien sin cuenta: se crea invited, se manda el enlace y queda asignado', async () => {
    const inserts = mockearDb({ rolEnOrganizacion: 'owner', usuarioExistente: null });
    const inviteUserByEmail = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: '44444444-4444-4444-4444-444444444444' } }, error: null });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail } } }),
    }));

    const { invitarColaborador } = await import('./invitarColaborador');
    const resultado = await invitarColaborador(
      { torneoId: TORNEO, email: 'nuevo@example.com', nombreCompleto: 'Nuevo Colaborador' },
      contextoCon('usuario-titular'),
    );

    expect(resultado).toEqual({ usuarioId: '44444444-4444-4444-4444-444444444444' });
    expect(inviteUserByEmail).toHaveBeenCalledWith('nuevo@example.com', expect.anything());
    expect(inserts.some((i) => i.startsWith('INSERT INTO usuario'))).toBe(true);
    expect(inserts.some((i) => i.startsWith('INSERT INTO colaborador_torneo'))).toBe(true);
  });

  it('sin nombreCompleto para alguien nuevo, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', usuarioExistente: null });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail: vi.fn() } } }),
    }));
    const { invitarColaborador } = await import('./invitarColaborador');
    await expect(
      invitarColaborador({ torneoId: TORNEO, email: 'nuevo@example.com' }, contextoCon('usuario-titular')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('invitar a alguien que ya tiene cuenta activa solo lo asigna, sin reenviar nada', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      usuarioExistente: { id: '55555555-5555-5555-5555-555555555555', estado: 'active' },
    });
    const inviteUserByEmail = vi.fn();
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail } } }),
    }));

    const { invitarColaborador } = await import('./invitarColaborador');
    const resultado = await invitarColaborador(
      { torneoId: TORNEO, email: 'existente@example.com' },
      contextoCon('usuario-titular'),
    );

    expect(resultado).toEqual({ usuarioId: '55555555-5555-5555-5555-555555555555' });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('un colaborador no puede invitar a otro colaborador', async () => {
    mockearDb({});
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { inviteUserByEmail: vi.fn() } } }),
    }));
    const { invitarColaborador } = await import('./invitarColaborador');
    await expect(
      invitarColaborador(
        { torneoId: TORNEO, email: 'x@example.com', nombreCompleto: 'X' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
