import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const TORNEO = '11111111-1111-1111-1111-111111111111';
const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  estado?: string;
  nivelVerificacion?: 'unverified' | 'basic' | 'trusted';
  rolOrganizacion?: 'owner' | 'admin';
}) {
  const consultas: Array<{ texto: string; valores: unknown[] }> = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto, valores });
        if (texto.includes('SELECT organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: 'org-1' }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('o.nivel_verificacion')) {
          return {
            rows: opciones.estado
              ? [
                  {
                    estado: opciones.estado,
                    nivel_verificacion: opciones.nivelVerificacion ?? 'basic',
                  },
                ]
              : [],
          };
        }
        return { rows: [] };
      },
    }),
  }));
  vi.doMock('@/lib/cache', () => ({
    invalidarCacheTorneo: vi.fn(),
    invalidarCacheEquipo: vi.fn(),
  }));
  return consultas;
}

describe('cambiarVisibilidadTorneo', () => {
  it('saca el torneo de las búsquedas', async () => {
    const consultas = mockearDb({ estado: 'in_progress', rolOrganizacion: 'owner' });
    const { cambiarVisibilidadTorneo } = await import('./cambiarVisibilidadTorneo');

    const resultado = await cambiarVisibilidadTorneo(
      { torneoId: TORNEO, visibilidad: 'unlisted' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({ visibilidad: 'unlisted' });
    const update = consultas.find((c) => c.texto.includes('UPDATE torneo'))!;
    expect(update.valores[0]).toBe('unlisted');
  });

  it('lo devuelve a las búsquedas con la organización verificada', async () => {
    mockearDb({ estado: 'in_progress', rolOrganizacion: 'owner', nivelVerificacion: 'basic' });
    const { cambiarVisibilidadTorneo } = await import('./cambiarVisibilidadTorneo');
    await expect(
      cambiarVisibilidadTorneo({ torneoId: TORNEO, visibilidad: 'public' }, contextoCon('u1')),
    ).resolves.toEqual({ visibilidad: 'public' });
  });

  /**
   * Si no, esto sería la puerta de atrás para saltearse la verificación
   * que `publicarTorneo` exige para entrar al descubrimiento (D-51).
   */
  it('sin verificar, no puede volver a las búsquedas', async () => {
    mockearDb({ estado: 'in_progress', rolOrganizacion: 'owner', nivelVerificacion: 'unverified' });
    const { cambiarVisibilidadTorneo } = await import('./cambiarVisibilidadTorneo');
    await expect(
      cambiarVisibilidadTorneo({ torneoId: TORNEO, visibilidad: 'public' }, contextoCon('u1')),
    ).rejects.toMatchObject({ codigo: 'ORGANIZACION_NO_VERIFICADA' });
  });

  /** Sin verificar sí puede sacarlo: esconderse nunca necesita permiso. */
  it('sin verificar, igual puede sacarlo de las búsquedas', async () => {
    mockearDb({ estado: 'in_progress', rolOrganizacion: 'owner', nivelVerificacion: 'unverified' });
    const { cambiarVisibilidadTorneo } = await import('./cambiarVisibilidadTorneo');
    await expect(
      cambiarVisibilidadTorneo({ torneoId: TORNEO, visibilidad: 'unlisted' }, contextoCon('u1')),
    ).resolves.toEqual({ visibilidad: 'unlisted' });
  });

  it('un borrador no tiene visibilidad que elegir', async () => {
    mockearDb({ estado: 'draft', rolOrganizacion: 'owner' });
    const { cambiarVisibilidadTorneo } = await import('./cambiarVisibilidadTorneo');
    await expect(
      cambiarVisibilidadTorneo({ torneoId: TORNEO, visibilidad: 'public' }, contextoCon('u1')),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('sin permiso sobre el torneo, SIN_PERMISO', async () => {
    mockearDb({ estado: 'in_progress' });
    const { cambiarVisibilidadTorneo } = await import('./cambiarVisibilidadTorneo');
    await expect(
      cambiarVisibilidadTorneo({ torneoId: TORNEO, visibilidad: 'unlisted' }, contextoCon('u1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
