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
  equiposAprobados?: number;
  rowCountUpdate?: number;
}) {
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
        if (texto.includes('count(*) FROM inscripcion')) {
          return { rows: [{ count: String(opciones.equiposAprobados ?? 0) }] };
        }
        if (texto.startsWith('UPDATE torneo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('actualizarTorneo', () => {
  it('el titular actualiza el nombre', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { actualizarTorneo } = await import('./actualizarTorneo');
    await expect(
      actualizarTorneo({ torneoId: TORNEO, nombre: 'Nueva Copa' }, contextoCon('usuario-1')),
    ).resolves.toEqual({ id: TORNEO });
  });

  it('no se puede bajar el cupo por debajo de los equipos aprobados', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', equiposAprobados: 6 });
    const { actualizarTorneo } = await import('./actualizarTorneo');
    await expect(
      actualizarTorneo({ torneoId: TORNEO, cupoEquipos: 4 }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'CUPO_MENOR_A_INSCRIPTOS' });
  });

  it('bajar el cupo por encima de los equipos aprobados sí se permite', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', equiposAprobados: 4 });
    const { actualizarTorneo } = await import('./actualizarTorneo');
    await expect(
      actualizarTorneo({ torneoId: TORNEO, cupoEquipos: 6 }, contextoCon('usuario-1')),
    ).resolves.toEqual({ id: TORNEO });
  });

  it('un colaborador no puede configurar el torneo', async () => {
    mockearDb({});
    const { actualizarTorneo } = await import('./actualizarTorneo');
    await expect(
      actualizarTorneo({ torneoId: TORNEO, nombre: 'X' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin ningún dato para actualizar, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { actualizarTorneo } = await import('./actualizarTorneo');
    await expect(
      actualizarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', rowCountUpdate: 0 });
    const { actualizarTorneo } = await import('./actualizarTorneo');
    await expect(
      actualizarTorneo({ torneoId: TORNEO, nombre: 'X' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
