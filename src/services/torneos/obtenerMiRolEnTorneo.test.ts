import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { organizacionId?: string; rolOrganizacion?: 'owner' | 'admin' }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT organizacion_id FROM torneo WHERE id')) {
          return {
            rows: opciones.organizacionId ? [{ organizacion_id: opciones.organizacionId }] : [],
          };
        }
        if (texto.includes('SELECT rol FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerMiRolEnTorneo', () => {
  it('sin sesión, false sin error', async () => {
    mockearDb({});
    const { obtenerMiRolEnTorneo } = await import('./obtenerMiRolEnTorneo');
    const resultado = await obtenerMiRolEnTorneo({ torneoId: TORNEO }, contextoCon(null));
    expect(resultado).toEqual({ puedeGestionar: false });
  });

  it('con sesión pero sin rol en la organización, false sin error', async () => {
    mockearDb({ organizacionId: 'org-1' });
    const { obtenerMiRolEnTorneo } = await import('./obtenerMiRolEnTorneo');
    const resultado = await obtenerMiRolEnTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado).toEqual({ puedeGestionar: false });
  });

  it('titular de la organización, true', async () => {
    mockearDb({ organizacionId: 'org-1', rolOrganizacion: 'owner' });
    const { obtenerMiRolEnTorneo } = await import('./obtenerMiRolEnTorneo');
    const resultado = await obtenerMiRolEnTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado).toEqual({ puedeGestionar: true });
  });
});
