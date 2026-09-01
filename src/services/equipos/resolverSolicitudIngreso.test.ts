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
  rowCountUpdate?: number;
  usuarioIdSolicitante?: string | null;
}) {
  const consultasCliente: string[] = [];
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
          consultasCliente.push(texto.trim());
          if (texto.trim().startsWith('UPDATE integrante_equipo')) {
            return { rowCount: opciones.rowCountUpdate ?? 1 };
          }
          if (texto.includes('SELECT usuario_id FROM perfil_deportivo')) {
            return {
              rows:
                opciones.usuarioIdSolicitante !== undefined
                  ? [{ usuario_id: opciones.usuarioIdSolicitante }]
                  : [],
            };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('resolverSolicitudIngreso', () => {
  it('aceptar activa el vínculo, sigue al equipo y notifica team_join_resolved', async () => {
    const consultas = mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      usuarioIdSolicitante: 'usuario-solicitante',
    });
    const { resolverSolicitudIngreso } = await import('./resolverSolicitudIngreso');

    const resultado = await resolverSolicitudIngreso(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        perfilId: '77777777-7777-7777-7777-777777777777',
        aceptar: true,
      },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ estado: 'active' });
    expect(consultas.some((c) => c.includes('seguimiento'))).toBe(true);
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'team_join_resolved' }),
      expect.anything(),
    );
  });

  it('un delegado también puede resolver (D-86)', async () => {
    mockearDb({
      perfilPropioId: '33333333-3333-3333-3333-333333333333',
      rolesEnEquipo: ['delegate'],
      usuarioIdSolicitante: 'usuario-solicitante',
    });
    const { resolverSolicitudIngreso } = await import('./resolverSolicitudIngreso');
    await expect(
      resolverSolicitudIngreso(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          aceptar: true,
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ estado: 'active' });
  });

  it('rechazar deja el vínculo declined, sin seguir', async () => {
    const consultas = mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      usuarioIdSolicitante: 'usuario-solicitante',
    });
    const { resolverSolicitudIngreso } = await import('./resolverSolicitudIngreso');

    await resolverSolicitudIngreso(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        perfilId: '77777777-7777-7777-7777-777777777777',
        aceptar: false,
      },
      contextoCon('usuario-1'),
    );

    expect(consultas.some((c) => c.includes('seguimiento'))).toBe(false);
  });

  it('sin solicitud pendiente, NO_ENCONTRADO', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      rowCountUpdate: 0,
    });
    const { resolverSolicitudIngreso } = await import('./resolverSolicitudIngreso');
    await expect(
      resolverSolicitudIngreso(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          aceptar: true,
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('un jugador sin más roles no puede resolver solicitudes', async () => {
    mockearDb({
      perfilPropioId: '55555555-5555-5555-5555-555555555555',
      rolesEnEquipo: ['player'],
    });
    const { resolverSolicitudIngreso } = await import('./resolverSolicitudIngreso');
    await expect(
      resolverSolicitudIngreso(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          aceptar: true,
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { resolverSolicitudIngreso } = await import('./resolverSolicitudIngreso');
    await expect(
      resolverSolicitudIngreso(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          aceptar: true,
        },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
