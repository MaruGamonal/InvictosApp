import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  torneo?: { id: string; organizacion_id: string; estado: string } | null;
  estadisticas?: Array<{
    perfil_id: string;
    nombre_visible: string;
    equipo_id: string;
    equipo_nombre: string;
    equipo_escudo_url: string | null;
    goles: number;
    tarjetas_amarillas: number;
    tarjetas_rojas: number;
  }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT id, organizacion_id, estado FROM torneo')) {
          const torneo =
            opciones.torneo === undefined
              ? { id: TORNEO, organizacion_id: ORG, estado: 'in_progress' }
              : opciones.torneo;
          return { rows: torneo ? [torneo] : [] };
        }
        if (t.startsWith('SELECT ej.perfil_id')) {
          return { rows: opciones.estadisticas ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerEstadisticasTorneo', () => {
  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ torneo: null });
    const { obtenerEstadisticasTorneo } = await import('./obtenerEstadisticasTorneo');
    await expect(
      obtenerEstadisticasTorneo({ torneoId: TORNEO }, VISITANTE),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin eventos cargados, listas vacías', async () => {
    mockearDb({ estadisticas: [] });
    const { obtenerEstadisticasTorneo } = await import('./obtenerEstadisticasTorneo');
    const resultado = await obtenerEstadisticasTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(resultado).toEqual({ goleadores: [], tarjetas: [] });
  });

  it('ordena goleadores de mayor a menor, y separa quien solo tiene tarjetas', async () => {
    mockearDb({
      estadisticas: [
        {
          perfil_id: 'p1',
          nombre_visible: 'Juan',
          equipo_id: 'e1',
          equipo_nombre: 'Los Pibes',
          equipo_escudo_url: null,
          goles: 2,
          tarjetas_amarillas: 0,
          tarjetas_rojas: 0,
        },
        {
          perfil_id: 'p2',
          nombre_visible: 'Ana',
          equipo_id: 'e2',
          equipo_nombre: 'Racing del Barrio',
          equipo_escudo_url: 'https://x/escudo.png',
          goles: 3,
          tarjetas_amarillas: 1,
          tarjetas_rojas: 0,
        },
        {
          perfil_id: 'p3',
          nombre_visible: 'DT Pedro',
          equipo_id: 'e1',
          equipo_nombre: 'Los Pibes',
          equipo_escudo_url: null,
          goles: 0,
          tarjetas_amarillas: 0,
          tarjetas_rojas: 1,
        },
      ],
    });
    const { obtenerEstadisticasTorneo } = await import('./obtenerEstadisticasTorneo');
    const resultado = await obtenerEstadisticasTorneo({ torneoId: TORNEO }, VISITANTE);

    expect(resultado.goleadores.map((g) => g.nombreVisible)).toEqual(['Ana', 'Juan']);
    expect(resultado.goleadores[0]).toEqual({
      perfilId: 'p2',
      nombreVisible: 'Ana',
      equipoId: 'e2',
      equipoNombre: 'Racing del Barrio',
      equipoEscudoUrl: 'https://x/escudo.png',
      goles: 3,
    });

    // tarjeta roja pesa más que amarilla al ordenar, y el DT (sin goles) figura acá.
    expect(resultado.tarjetas.map((t) => t.nombreVisible)).toEqual(['DT Pedro', 'Ana']);
  });
});
