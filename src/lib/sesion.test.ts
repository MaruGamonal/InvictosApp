import { describe, expect, it, vi } from 'vitest';

describe('obtenerUsuarioIdDeSesion', () => {
  it('devuelve el id del usuario cuando getUser() encuentra sesión', async () => {
    vi.resetModules();
    vi.doMock('./supabase/servidor', () => ({
      crearClienteServidor: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'abc-123' } } }) },
      }),
    }));

    const { obtenerUsuarioIdDeSesion } = await import('./sesion');
    expect(await obtenerUsuarioIdDeSesion()).toBe('abc-123');
    vi.doUnmock('./supabase/servidor');
  });

  it('devuelve null sin sesión — es un estado válido, no un error (D-04b)', async () => {
    vi.resetModules();
    vi.doMock('./supabase/servidor', () => ({
      crearClienteServidor: async () => ({
        auth: { getUser: async () => ({ data: { user: null } }) },
      }),
    }));

    const { obtenerUsuarioIdDeSesion } = await import('./sesion');
    expect(await obtenerUsuarioIdDeSesion()).toBeNull();
    vi.doUnmock('./supabase/servidor');
  });
});
