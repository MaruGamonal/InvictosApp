import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  invitaciones?: Array<{ perfil_id: string; nombre_visible: string; rol_equipo: string }>;
  solicitudes?: Array<{ perfil_id: string; nombre_visible: string }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo WHERE usuario_id')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('SELECT rol_equipo FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.includes("estado_vinculo = 'invited'")) {
          return { rows: opciones.invitaciones ?? [] };
        }
        if (texto.includes("estado_vinculo = 'requested'")) {
          return { rows: opciones.solicitudes ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerGestionEquipo', () => {
  it('trae invitaciones y solicitudes pendientes para quien puede gestionar el plantel', async () => {
    mockearDb({
      perfilId: '21111111-1111-1111-1111-111111111111',
      rolesEnEquipo: ['captain'],
      invitaciones: [
        { perfil_id: 'p-1', nombre_visible: 'Ana', rol_equipo: 'player' },
        { perfil_id: 'p-2', nombre_visible: 'Beto', rol_equipo: 'coach' },
      ],
      solicitudes: [{ perfil_id: 'p-3', nombre_visible: 'Caro' }],
    });
    const { obtenerGestionEquipo } = await import('./obtenerGestionEquipo');

    const resultado = await obtenerGestionEquipo(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );

    expect(resultado.invitacionesPendientes).toEqual([
      { perfilId: 'p-1', nombreVisible: 'Ana', rol: 'player' },
      { perfilId: 'p-2', nombreVisible: 'Beto', rol: 'coach' },
    ]);
    expect(resultado.solicitudesPendientes).toEqual([{ perfilId: 'p-3', nombreVisible: 'Caro' }]);
  });

  it('sin ser capitán ni delegado, SIN_PERMISO', async () => {
    mockearDb({
      perfilId: '21111111-1111-1111-1111-111111111111',
      rolesEnEquipo: ['player'],
    });
    const { obtenerGestionEquipo } = await import('./obtenerGestionEquipo');

    await expect(
      obtenerGestionEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { obtenerGestionEquipo } = await import('./obtenerGestionEquipo');
    await expect(
      obtenerGestionEquipo({ equipoId: '11111111-1111-1111-1111-111111111111' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
