import { describe, expect, it, vi } from 'vitest';

describe('contextoDeSistema', () => {
  it('no tiene usuario y se marca como contexto del sistema', async () => {
    const { contextoDeSistema } = await import('./contexto');
    expect(contextoDeSistema()).toEqual({ usuarioId: null, permisos: {}, esSistema: true });
  });
});

describe('construirContexto', () => {
  it('usa el usuario_id de la sesión, nunca uno provisto por el cliente', async () => {
    vi.resetModules();
    vi.doMock('./sesion', () => ({ obtenerUsuarioIdDeSesion: async () => 'usuario-de-la-sesion' }));
    const { construirContexto } = await import('./contexto');

    const contexto = await construirContexto();

    expect(contexto).toEqual({ usuarioId: 'usuario-de-la-sesion', permisos: {}, esSistema: false });
    vi.doUnmock('./sesion');
  });

  it('sin sesión, usuarioId es null — un estado válido, no un error (D-04b)', async () => {
    vi.resetModules();
    vi.doMock('./sesion', () => ({ obtenerUsuarioIdDeSesion: async () => null }));
    const { construirContexto } = await import('./contexto');

    const contexto = await construirContexto();

    expect(contexto.usuarioId).toBeNull();
    expect(contexto.esSistema).toBe(false);
    vi.doUnmock('./sesion');
  });
});
