import { beforeEach, describe, expect, it, vi } from 'vitest';

const notificarMock = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  notificarMock.mockClear();
  vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: notificarMock }));
});

function mockearDb(filas: Array<{ usuario_id: string | null }>) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({ query: async () => ({ rows: filas }) }),
  }));
}

describe('notificarCambioDeTorneo', () => {
  it('notifica a los capitanes/delegados de los equipos inscriptos y a los seguidores', async () => {
    mockearDb([{ usuario_id: 'usuario-1' }, { usuario_id: 'usuario-2' }]);
    const { notificarCambioDeTorneo } = await import('./_notificarCambio');

    await notificarCambioDeTorneo('torneo-1', 'tournament_cancelled', {
      usuarioId: 'x',
      permisos: {},
      esSistema: false,
    });

    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'tournament_cancelled',
        entidadOrigenTipo: 'torneo',
        entidadOrigenId: 'torneo-1',
        destinatarios: {
          usuarioIds: ['usuario-1', 'usuario-2'],
          seguidoresDe: [{ tipoSeguido: 'tournament', entidadId: 'torneo-1' }],
        },
      }),
      expect.anything(),
    );
  });

  it('filtra los usuario_id nulos (integrantes sin cuenta)', async () => {
    mockearDb([{ usuario_id: null }, { usuario_id: 'usuario-2' }]);
    const { notificarCambioDeTorneo } = await import('./_notificarCambio');

    await notificarCambioDeTorneo('torneo-1', 'tournament_started', {
      usuarioId: null,
      permisos: {},
      esSistema: true,
    });

    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarios: expect.objectContaining({ usuarioIds: ['usuario-2'] }),
      }),
      expect.anything(),
    );
  });
});
