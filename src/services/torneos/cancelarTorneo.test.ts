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

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin'; estadoTorneo?: string }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.startsWith('SELECT estado FROM torneo')) {
          return { rows: [{ estado: opciones.estadoTorneo ?? 'registration_open' }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

function mockearNotificarCambio() {
  const spy = vi.fn(async () => {});
  vi.doMock('./_notificarCambio', () => ({ notificarCambioDeTorneo: spy }));
  return spy;
}

describe('cancelarTorneo', () => {
  it('cancela un torneo publicado y notifica tournament_cancelled', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'registration_open' });
    const notificarCambio = mockearNotificarCambio();
    const { cancelarTorneo } = await import('./cancelarTorneo');

    const resultado = await cancelarTorneo(
      { torneoId: TORNEO, motivo: 'insufficient_teams' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ estado: 'cancelled' });
    expect(notificarCambio).toHaveBeenCalledWith(TORNEO, 'tournament_cancelled', expect.anything());
  });

  it('con motivo other, hace falta el texto libre', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    mockearNotificarCambio();
    const { cancelarTorneo } = await import('./cancelarTorneo');
    await expect(
      cancelarTorneo({ torneoId: TORNEO, motivo: 'other' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('con motivo other y texto libre, se guarda el detalle', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    mockearNotificarCambio();
    const { cancelarTorneo } = await import('./cancelarTorneo');
    await expect(
      cancelarTorneo(
        { torneoId: TORNEO, motivo: 'other', motivoDetalle: 'Se cayó la cancha' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ estado: 'cancelled' });
  });

  it('un torneo en draft no se puede cancelar (nada que cancelar todavía)', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'draft' });
    mockearNotificarCambio();
    const { cancelarTorneo } = await import('./cancelarTorneo');
    await expect(
      cancelarTorneo({ torneoId: TORNEO, motivo: 'organizer_decision' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('un torneo ya cancelado no se puede volver a cancelar', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'cancelled' });
    mockearNotificarCambio();
    const { cancelarTorneo } = await import('./cancelarTorneo');
    await expect(
      cancelarTorneo({ torneoId: TORNEO, motivo: 'organizer_decision' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('un colaborador no puede cancelar el torneo', async () => {
    mockearDb({});
    mockearNotificarCambio();
    const { cancelarTorneo } = await import('./cancelarTorneo');
    await expect(
      cancelarTorneo({ torneoId: TORNEO, motivo: 'organizer_decision' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
