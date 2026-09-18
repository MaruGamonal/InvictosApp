import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  vinculadas?: Array<{ organizacionId: string; rol: 'owner' | 'admin' }>;
  nombre?: string;
}) {
  vi.doMock('@/lib/permisos', () => ({
    listarOrganizacionesVinculadas: async () => opciones.vinculadas ?? [],
  }));
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async () => ({ rows: opciones.nombre ? [{ nombre: opciones.nombre }] : [] }),
    }),
  }));
}

describe('resolverOrganizacionActiva', () => {
  it('devuelve null cuando la persona no administra ninguna organización', async () => {
    mockearDb({ vinculadas: [] });
    const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');

    const resultado = await resolverOrganizacionActiva(undefined, contextoCon('usuario-1'));

    expect(resultado).toBeNull();
  });

  it('devuelve la organización donde es Titular', async () => {
    mockearDb({
      vinculadas: [{ organizacionId: 'org-1', rol: 'owner' }],
      nombre: 'Liga Palermo',
    });
    const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');

    const resultado = await resolverOrganizacionActiva(undefined, contextoCon('usuario-1'));

    expect(resultado).toEqual({ organizacionId: 'org-1', nombre: 'Liga Palermo', rol: 'owner' });
  });

  it('devuelve la organización donde es Administrador si no tiene ninguna propia', async () => {
    mockearDb({
      vinculadas: [{ organizacionId: 'org-2', rol: 'admin' }],
      nombre: 'Torneos de Vale',
    });
    const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');

    const resultado = await resolverOrganizacionActiva(undefined, contextoCon('usuario-1'));

    expect(resultado).toEqual({ organizacionId: 'org-2', nombre: 'Torneos de Vale', rol: 'admin' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');
    await expect(resolverOrganizacionActiva(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });
});
