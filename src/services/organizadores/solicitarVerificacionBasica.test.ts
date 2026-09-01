import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';

function mockearDb(rolEnOrganizacion: 'owner' | 'admin' | null) {
  const query = vi.fn(async (texto: string) => {
    const sql = texto.toUpperCase();
    if (sql.includes('FROM MIEMBRO_ORGANIZACION')) {
      return { rows: rolEnOrganizacion ? [{ rol: rolEnOrganizacion }] : [] };
    }
    if (sql.includes('FROM ORGANIZACION O JOIN USUARIO')) {
      return { rows: [{ email: 'titular@example.com', nivel_verificacion: 'unverified' }] };
    }
    return { rows: [] };
  });
  vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
}

beforeEach(() => {
  vi.resetModules();
  reiniciarLimitesDeFrecuencia();
});

describe('solicitarVerificacionBasica', () => {
  it('el Titular puede solicitarla, y se manda el enlace con la metadata correcta', async () => {
    mockearDb('owner');
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { signInWithOtp } }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    const resultado = await solicitarVerificacionBasica(
      { organizacionId: ORG },
      contextoCon('titular'),
    );

    expect(resultado).toEqual({ enviado: true });
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'titular@example.com',
        options: expect.objectContaining({
          shouldCreateUser: false,
          data: { accion: 'verificar_organizacion', organizacion_id: ORG },
        }),
      }),
    );
    vi.doUnmock('@/db/cliente');
    vi.doUnmock('@/lib/supabase/admin');
  });

  it('un Administrador (no Titular) no puede solicitarla', async () => {
    mockearDb('admin');
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { signInWithOtp: vi.fn() } }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    await expect(
      solicitarVerificacionBasica({ organizacionId: ORG }, contextoCon('admin-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    vi.doUnmock('@/db/cliente');
    vi.doUnmock('@/lib/supabase/admin');
  });
});
