import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const notificarMock = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  notificarMock.mockClear();
  vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: notificarMock }));
});

function mockearDb(opciones: {
  perfilPropioId?: string | null;
  rolesEnEquipo?: string[];
  perfilObjetivo?: { id: string; usuario_id: string | null } | null;
  estadoVinculoExistente?: string;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo WHERE usuario_id')) {
          return { rows: opciones.perfilPropioId ? [{ id: opciones.perfilPropioId }] : [] };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          if (texto.includes('FROM perfil_deportivo WHERE id')) {
            return { rows: opciones.perfilObjetivo ? [opciones.perfilObjetivo] : [] };
          }
          if (texto.trim().startsWith('SELECT estado_vinculo')) {
            return {
              rows: opciones.estadoVinculoExistente
                ? [{ estado_vinculo: opciones.estadoVinculoExistente }]
                : [],
            };
          }
          if (texto.trim().startsWith('INSERT INTO perfil_deportivo')) {
            return { rows: [{ id: 'perfil-nuevo-sin-cuenta' }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
}

describe('invitarIntegrante', () => {
  it('a una persona con cuenta: vínculo invited y notifica team_invitation', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      perfilObjetivo: { id: '66666666-6666-6666-6666-666666666666', usuario_id: 'usuario-jugador' },
    });
    const { invitarIntegrante } = await import('./invitarIntegrante');

    const resultado = await invitarIntegrante(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        roles: ['player'],
        perfilId: '66666666-6666-6666-6666-666666666666',
      },
      contextoCon('usuario-cap'),
    );

    expect(resultado.vinculos).toEqual([{ rol: 'player', estado: 'invited' }]);
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'team_invitation' }),
      expect.anything(),
    );
  });

  it('a una persona sin cuenta: crea el perfil y el vínculo queda active de inmediato', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
    });
    const { invitarIntegrante } = await import('./invitarIntegrante');

    const resultado = await invitarIntegrante(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        roles: ['player'],
        nombreVisible: 'Juan Sin Cuenta',
      },
      contextoCon('usuario-cap'),
    );

    expect(resultado.perfilId).toBe('perfil-nuevo-sin-cuenta');
    expect(resultado.vinculos).toEqual([{ rol: 'player', estado: 'active' }]);
    expect(notificarMock).not.toHaveBeenCalled();
  });

  it('con roles de jugador y DT a la vez, quedan dos vínculos', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      perfilObjetivo: { id: '77777777-7777-7777-7777-777777777777', usuario_id: 'usuario-x' },
    });
    const { invitarIntegrante } = await import('./invitarIntegrante');

    const resultado = await invitarIntegrante(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        roles: ['player', 'coach'],
        perfilId: '77777777-7777-7777-7777-777777777777',
      },
      contextoCon('usuario-cap'),
    );

    expect(resultado.vinculos).toEqual([
      { rol: 'player', estado: 'invited' },
      { rol: 'coach', estado: 'invited' },
    ]);
  });

  it('invitar a alguien que ya solicitó sumarse cruza el vínculo a active (D-85)', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      perfilObjetivo: { id: '77777777-7777-7777-7777-777777777777', usuario_id: 'usuario-x' },
      estadoVinculoExistente: 'requested',
    });
    const { invitarIntegrante } = await import('./invitarIntegrante');

    const resultado = await invitarIntegrante(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        roles: ['player'],
        perfilId: '77777777-7777-7777-7777-777777777777',
      },
      contextoCon('usuario-cap'),
    );

    expect(resultado.vinculos).toEqual([{ rol: 'player', estado: 'active' }]);
  });

  it('un integrante con rol coach y nada más no puede invitar (SIN_PERMISO)', async () => {
    mockearDb({ perfilPropioId: '44444444-4444-4444-4444-444444444444', rolesEnEquipo: ['coach'] });
    const { invitarIntegrante } = await import('./invitarIntegrante');

    await expect(
      invitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          roles: ['player'],
          perfilId: '77777777-7777-7777-7777-777777777777',
        },
        contextoCon('usuario-dt'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('rechaza si se pasan perfilId y nombreVisible a la vez', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
    });
    const { invitarIntegrante } = await import('./invitarIntegrante');

    await expect(
      invitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          roles: ['player'],
          perfilId: '77777777-7777-7777-7777-777777777777',
          nombreVisible: 'X',
        },
        contextoCon('usuario-cap'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { invitarIntegrante } = await import('./invitarIntegrante');
    await expect(
      invitarIntegrante(
        { equipoId: '11111111-1111-1111-1111-111111111111', roles: ['player'], perfilId: 'p' },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
