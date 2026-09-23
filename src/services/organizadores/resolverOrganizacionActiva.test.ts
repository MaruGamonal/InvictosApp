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

  /**
   * La preferencia llega de una cookie, que el cliente controla. Si
   * bastara con escribir ahí un id ajeno para gestionar esa
   * organización, sería una escalada de privilegios de una línea.
   */
  describe('organización preferida', () => {
    it('respeta la elegida cuando es una de las suyas', async () => {
      mockearDb({
        vinculadas: [
          { organizacionId: 'org-1', rol: 'owner' },
          { organizacionId: 'org-2', rol: 'admin' },
        ],
        nombre: 'Club del Sur',
      });
      const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');

      const resultado = await resolverOrganizacionActiva(
        { organizacionIdPreferida: 'org-2' },
        contextoCon('usuario-1'),
      );

      expect(resultado?.organizacionId).toBe('org-2');
      expect(resultado?.rol).toBe('admin');
    });

    it('ignora una organización ajena: la cookie no otorga acceso', async () => {
      mockearDb({
        vinculadas: [{ organizacionId: 'org-1', rol: 'owner' }],
        nombre: 'Liga Palermo',
      });
      const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');

      const resultado = await resolverOrganizacionActiva(
        { organizacionIdPreferida: 'org-de-otra-persona' },
        contextoCon('usuario-1'),
      );

      expect(resultado?.organizacionId).toBe('org-1');
    });

    it('una preferencia vieja no deja a nadie afuera de su propio panel', async () => {
      // Dejó de ser miembro de la que tenía elegida: cae a la primera
      // suya en vez de devolver null.
      mockearDb({
        vinculadas: [{ organizacionId: 'org-1', rol: 'owner' }],
        nombre: 'Liga Palermo',
      });
      const { resolverOrganizacionActiva } = await import('./resolverOrganizacionActiva');

      const resultado = await resolverOrganizacionActiva(
        { organizacionIdPreferida: 'org-que-ya-no-administra' },
        contextoCon('usuario-1'),
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.organizacionId).toBe('org-1');
    });
  });
});
