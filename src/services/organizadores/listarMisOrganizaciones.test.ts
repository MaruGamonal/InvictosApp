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
  filas?: unknown[];
}) {
  vi.doMock('@/lib/permisos', () => ({
    listarOrganizacionesVinculadas: async () => opciones.vinculadas ?? [],
  }));
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({ query: async () => ({ rows: opciones.filas ?? [] }) }),
  }));
}

const FILA = (id: string, nombre: string, torneos = '0') => ({
  id,
  nombre,
  logo_url: null,
  nivel_verificacion: 'unverified',
  cantidad_torneos: torneos,
});

describe('listarMisOrganizaciones', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { listarMisOrganizaciones } = await import('./listarMisOrganizaciones');
    await expect(listarMisOrganizaciones(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('sin organizaciones devuelve la lista vacía, no null', async () => {
    mockearDb({ vinculadas: [] });
    const { listarMisOrganizaciones } = await import('./listarMisOrganizaciones');
    await expect(listarMisOrganizaciones(undefined, contextoCon('u-1'))).resolves.toEqual([]);
  });

  it('trae propias y ajenas, con su rol', async () => {
    mockearDb({
      vinculadas: [
        { organizacionId: 'org-1', rol: 'owner' },
        { organizacionId: 'org-2', rol: 'admin' },
      ],
      filas: [FILA('org-1', 'Liga Palermo', '3'), FILA('org-2', 'Club del Sur', '1')],
    });
    const { listarMisOrganizaciones } = await import('./listarMisOrganizaciones');

    const lista = await listarMisOrganizaciones(undefined, contextoCon('u-1'));

    expect(lista).toHaveLength(2);
    expect(lista[0]).toMatchObject({ nombre: 'Liga Palermo', rol: 'owner', cantidadTorneos: 3 });
    expect(lista[1]).toMatchObject({ nombre: 'Club del Sur', rol: 'admin', cantidadTorneos: 1 });
  });

  /**
   * El orden lo fija `listarOrganizacionesVinculadas` (propias primero);
   * la consulta agrupa y no lo conserva, así que se reordena a mano. Si
   * eso se rompiera, la organización propia podría quedar segunda.
   */
  it('conserva el orden de los vínculos aunque la consulta devuelva otro', async () => {
    mockearDb({
      vinculadas: [
        { organizacionId: 'org-1', rol: 'owner' },
        { organizacionId: 'org-2', rol: 'admin' },
      ],
      filas: [FILA('org-2', 'Club del Sur'), FILA('org-1', 'Liga Palermo')],
    });
    const { listarMisOrganizaciones } = await import('./listarMisOrganizaciones');

    const lista = await listarMisOrganizaciones(undefined, contextoCon('u-1'));

    expect(lista.map((o) => o.organizacionId)).toEqual(['org-1', 'org-2']);
  });

  it('una organización sin fila no rompe la lista: se saltea', async () => {
    mockearDb({
      vinculadas: [
        { organizacionId: 'org-1', rol: 'owner' },
        { organizacionId: 'org-borrada', rol: 'admin' },
      ],
      filas: [FILA('org-1', 'Liga Palermo')],
    });
    const { listarMisOrganizaciones } = await import('./listarMisOrganizaciones');

    const lista = await listarMisOrganizaciones(undefined, contextoCon('u-1'));

    expect(lista.map((o) => o.organizacionId)).toEqual(['org-1']);
  });
});
