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
  rowCountUpdate?: number;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.startsWith('UPDATE integrante_equipo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('cancelarInvitacion', () => {
  it('el capitán cancela una invitación pendiente', async () => {
    mockearDb({ perfilId: '22222222-2222-2222-2222-222222222222', rolesEnEquipo: ['captain'] });
    const { cancelarInvitacion } = await import('./cancelarInvitacion');
    await expect(
      cancelarInvitacion(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'player',
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ estado: 'cancelled' });
  });

  it('sin invitación pendiente que cancelar, NO_ENCONTRADO', async () => {
    mockearDb({
      perfilId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      rowCountUpdate: 0,
    });
    const { cancelarInvitacion } = await import('./cancelarInvitacion');
    await expect(
      cancelarInvitacion(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'player',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('un jugador no puede cancelar invitaciones', async () => {
    mockearDb({ perfilId: '55555555-5555-5555-5555-555555555555', rolesEnEquipo: ['player'] });
    const { cancelarInvitacion } = await import('./cancelarInvitacion');
    await expect(
      cancelarInvitacion(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'player',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { cancelarInvitacion } = await import('./cancelarInvitacion');
    await expect(
      cancelarInvitacion(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'player',
        },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
