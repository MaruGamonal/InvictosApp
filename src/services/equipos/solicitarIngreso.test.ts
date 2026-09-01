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
  estadoEquipo?: string;
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  estadoVinculoExistente?: string;
  gestores?: Array<{ perfil_id: string; usuario_id: string | null }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT estado FROM equipo')) {
          return { rows: opciones.estadoEquipo ? [{ estado: opciones.estadoEquipo }] : [] };
        }
        if (texto.includes('FROM perfil_deportivo WHERE usuario_id')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('SELECT rol_equipo FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.includes('ie.perfil_id, pd.usuario_id')) {
          return { rows: opciones.gestores ?? [] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          if (texto.trim().startsWith('SELECT estado_vinculo')) {
            return {
              rows: opciones.estadoVinculoExistente
                ? [{ estado_vinculo: opciones.estadoVinculoExistente }]
                : [],
            };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
}

describe('solicitarIngreso', () => {
  it('crea la solicitud y notifica a capitán y delegados', async () => {
    mockearDb({
      estadoEquipo: 'active',
      perfilId: '21111111-1111-1111-1111-111111111111',
      gestores: [
        { perfil_id: '22222222-2222-2222-2222-222222222222', usuario_id: 'usuario-cap' },
        { perfil_id: '33333333-3333-3333-3333-333333333333', usuario_id: 'usuario-del' },
      ],
    });
    const { solicitarIngreso } = await import('./solicitarIngreso');

    const resultado = await solicitarIngreso(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ estado: 'requested' });
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'team_join_requested',
        destinatarios: { usuarioIds: ['usuario-cap', 'usuario-del'] },
      }),
      expect.anything(),
    );
  });

  it('si ya hay una invitación pendiente, cruza a active y no notifica team_join_requested', async () => {
    mockearDb({
      estadoEquipo: 'active',
      perfilId: '21111111-1111-1111-1111-111111111111',
      estadoVinculoExistente: 'invited',
    });
    const { solicitarIngreso } = await import('./solicitarIngreso');

    const resultado = await solicitarIngreso(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ estado: 'active' });
    expect(notificarMock).not.toHaveBeenCalled();
  });

  it('ya es jugador activo del equipo: no hay nada que solicitar', async () => {
    mockearDb({
      estadoEquipo: 'active',
      perfilId: '21111111-1111-1111-1111-111111111111',
      rolesEnEquipo: ['player'],
    });
    const { solicitarIngreso } = await import('./solicitarIngreso');
    await expect(
      solicitarIngreso(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un equipo archivado no admite solicitudes', async () => {
    mockearDb({ estadoEquipo: 'archived', perfilId: '21111111-1111-1111-1111-111111111111' });
    const { solicitarIngreso } = await import('./solicitarIngreso');
    await expect(
      solicitarIngreso(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('equipo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111' });
    const { solicitarIngreso } = await import('./solicitarIngreso');
    await expect(
      solicitarIngreso(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { solicitarIngreso } = await import('./solicitarIngreso');
    await expect(
      solicitarIngreso({ equipoId: '11111111-1111-1111-1111-111111111111' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
