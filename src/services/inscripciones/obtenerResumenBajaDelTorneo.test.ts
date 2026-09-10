import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const EQUIPO = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string;
  rolesEnEquipo?: string[];
  fila?: Record<string, unknown> | null;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo WHERE usuario_id')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (sql.startsWith('SELECT rol_equipo FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? ['captain']).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (sql.includes('FROM inscripcion i')) {
          return {
            rows:
              opciones.fila === undefined
                ? [
                    {
                      torneo_nombre: 'Copa Otoño F5',
                      torneo_estado: 'in_progress',
                      equipo_nombre: 'San Martín FC',
                      inscripcion_estado: 'approved',
                    },
                  ]
                : opciones.fila
                  ? [opciones.fila]
                  : [],
          };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerResumenBajaDelTorneo', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { obtenerResumenBajaDelTorneo } = await import('./obtenerResumenBajaDelTorneo');
    await expect(
      obtenerResumenBajaDelTorneo({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('sin ser capitán, SIN_PERMISO', async () => {
    mockearDb({ perfilId: 'perfil-1', rolesEnEquipo: ['delegate'] });
    const { obtenerResumenBajaDelTorneo } = await import('./obtenerResumenBajaDelTorneo');
    await expect(
      obtenerResumenBajaDelTorneo({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin inscripción de ese equipo en ese torneo, NO_ENCONTRADO', async () => {
    mockearDb({ perfilId: 'perfil-1', fila: null });
    const { obtenerResumenBajaDelTorneo } = await import('./obtenerResumenBajaDelTorneo');
    await expect(
      obtenerResumenBajaDelTorneo({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('trae los nombres y el estado del torneo y de la inscripción', async () => {
    mockearDb({ perfilId: 'perfil-1' });
    const { obtenerResumenBajaDelTorneo } = await import('./obtenerResumenBajaDelTorneo');
    const resultado = await obtenerResumenBajaDelTorneo(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({
      torneoNombre: 'Copa Otoño F5',
      torneoEstado: 'in_progress',
      equipoNombre: 'San Martín FC',
      inscripcionEstado: 'approved',
    });
  });
});
