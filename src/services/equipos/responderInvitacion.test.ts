import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { perfilId?: string | null; rowCountUpdate?: number }) {
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim());
          if (texto.trim().startsWith('UPDATE integrante_equipo')) {
            return { rowCount: opciones.rowCountUpdate ?? 1 };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('responderInvitacion', () => {
  it('aceptar activa el vínculo y sigue al equipo automáticamente', async () => {
    const consultas = mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111' });
    const { responderInvitacion } = await import('./responderInvitacion');

    const resultado = await responderInvitacion(
      { equipoId: '11111111-1111-1111-1111-111111111111', aceptar: true },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ rolesResueltos: 1 });
    expect(consultas.some((c) => c.includes('seguimiento'))).toBe(true);
  });

  it('rechazar deja el vínculo en declined, sin seguir al equipo', async () => {
    const consultas = mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111' });
    const { responderInvitacion } = await import('./responderInvitacion');

    await responderInvitacion(
      { equipoId: '11111111-1111-1111-1111-111111111111', aceptar: false },
      contextoCon('usuario-1'),
    );

    expect(consultas.some((c) => c.includes('seguimiento'))).toBe(false);
  });

  it('sin invitación pendiente, NO_ENCONTRADO', async () => {
    mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111', rowCountUpdate: 0 });
    const { responderInvitacion } = await import('./responderInvitacion');
    await expect(
      responderInvitacion(
        { equipoId: '11111111-1111-1111-1111-111111111111', aceptar: true },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { responderInvitacion } = await import('./responderInvitacion');
    await expect(
      responderInvitacion(
        { equipoId: '11111111-1111-1111-1111-111111111111', aceptar: true },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
