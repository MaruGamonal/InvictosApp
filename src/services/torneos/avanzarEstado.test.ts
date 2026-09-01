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
  estadoTorneo?: string;
  hayPartidos?: boolean;
  equiposInscriptos?: string[];
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.startsWith('SELECT estado FROM torneo')) {
          return { rows: [{ estado: opciones.estadoTorneo ?? 'registration_closed' }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.includes('FROM partido WHERE torneo_id')) {
          return { rows: opciones.hayPartidos ? [{}] : [] };
        }
        if (texto.includes('SELECT equipo_id FROM inscripcion')) {
          return { rows: (opciones.equiposInscriptos ?? []).map((equipo_id) => ({ equipo_id })) };
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

describe('avanzarEstado', () => {
  it('registration_closed a in_progress, con fixture generado', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      estadoTorneo: 'registration_closed',
      hayPartidos: true,
    });
    const notificarCambio = mockearNotificarCambio();
    const { avanzarEstado } = await import('./avanzarEstado');

    const resultado = await avanzarEstado(
      { torneoId: TORNEO, estadoDestino: 'in_progress' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ estado: 'in_progress' });
    expect(notificarCambio).toHaveBeenCalledWith(TORNEO, 'tournament_started', expect.anything());
  });

  it('no se puede pasar a in_progress sin fixture generado', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      estadoTorneo: 'registration_closed',
      hayPartidos: false,
    });
    const { avanzarEstado } = await import('./avanzarEstado');
    await expect(
      avanzarEstado({ torneoId: TORNEO, estadoDestino: 'in_progress' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('in_progress a finished notifica tournament_finished', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'in_progress' });
    const notificarCambio = mockearNotificarCambio();
    const { avanzarEstado } = await import('./avanzarEstado');

    await avanzarEstado({ torneoId: TORNEO, estadoDestino: 'finished' }, contextoCon('usuario-1'));

    expect(notificarCambio).toHaveBeenCalledWith(TORNEO, 'tournament_finished', expect.anything());
  });

  it('avanzar el estado no rompe cuando hay equipos inscriptos (su perfil público muestra el estado del torneo)', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      estadoTorneo: 'in_progress',
      equiposInscriptos: ['equipo-1', 'equipo-2'],
    });
    mockearNotificarCambio();
    const { avanzarEstado } = await import('./avanzarEstado');

    await expect(
      avanzarEstado({ torneoId: TORNEO, estadoDestino: 'finished' }, contextoCon('usuario-1')),
    ).resolves.toEqual({ estado: 'finished' });
  });

  it('draft no puede saltar directo a in_progress (eso es publicarTorneo)', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'draft' });
    const { avanzarEstado } = await import('./avanzarEstado');
    await expect(
      avanzarEstado(
        { torneoId: TORNEO, estadoDestino: 'registration_open' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('suspended puede retomarse hacia cualquiera de los tres estados activos', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'suspended', hayPartidos: true });
    const { avanzarEstado } = await import('./avanzarEstado');
    await expect(
      avanzarEstado({ torneoId: TORNEO, estadoDestino: 'in_progress' }, contextoCon('usuario-1')),
    ).resolves.toEqual({ estado: 'in_progress' });
  });

  it('finished es terminal para avanzarEstado: no admite ninguna transición', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'finished' });
    const { avanzarEstado } = await import('./avanzarEstado');
    await expect(
      avanzarEstado({ torneoId: TORNEO, estadoDestino: 'suspended' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('un colaborador no puede avanzar el estado', async () => {
    mockearDb({});
    const { avanzarEstado } = await import('./avanzarEstado');
    await expect(
      avanzarEstado(
        { torneoId: TORNEO, estadoDestino: 'registration_closed' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
