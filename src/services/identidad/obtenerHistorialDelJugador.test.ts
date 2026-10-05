import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';

const PERFIL = '11111111-1111-1111-1111-111111111111';

function filaCruda(overrides: Record<string, unknown> = {}) {
  return {
    torneo_id: '22222222-2222-2222-2222-222222222222',
    torneo_nombre: 'Copa Costanera',
    estado: 'finished',
    modalidad: 'f5',
    categoria_genero: 'mixed',
    ciudad_nombre: 'Posadas',
    fecha_inicio: new Date('2025-03-01T00:00:00.000Z'),
    fecha_fin: null,
    equipo_id: '33333333-3333-3333-3333-333333333333',
    equipo_nombre: 'Deportivo Pichincha',
    equipo_escudo_url: null,
    rol_en_torneo: 'player',
    goles: 3,
    tarjetas_amarillas: 1,
    tarjetas_rojas: 0,
    veces_jugador_del_partido: '2',
    ...overrides,
  };
}

function mockearDb(filas: ReturnType<typeof filaCruda>[]) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({ query: async () => ({ rows: filas }) }),
  }));
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.doUnmock('@/db/cliente'));

describe('obtenerHistorialDelJugador', () => {
  it('convierte las fechas a ISO y los conteos a número', async () => {
    mockearDb([filaCruda()]);
    const { obtenerHistorialDelJugador } = await import('./obtenerHistorialDelJugador');

    const historial = await obtenerHistorialDelJugador({ perfilId: PERFIL }, CONTEXTO_PUBLICO);

    expect(historial[0]).toMatchObject({
      torneoNombre: 'Copa Costanera',
      equipoNombre: 'Deportivo Pichincha',
      fechaInicio: '2025-03-01T00:00:00.000Z',
      fechaFin: null,
      goles: 3,
      vecesJugadorDelPartido: 2,
    });
  });

  /** Lo más reciente primero: es un historial, se lee de arriba hacia atrás. */
  it('ordena por fecha de inicio descendente', async () => {
    mockearDb([
      filaCruda({ torneo_nombre: 'Vieja', fecha_inicio: new Date('2023-01-01T00:00:00.000Z') }),
      filaCruda({ torneo_nombre: 'Nueva', fecha_inicio: new Date('2026-01-01T00:00:00.000Z') }),
      filaCruda({ torneo_nombre: 'Media', fecha_inicio: new Date('2024-06-01T00:00:00.000Z') }),
    ]);
    const { obtenerHistorialDelJugador } = await import('./obtenerHistorialDelJugador');

    const historial = await obtenerHistorialDelJugador({ perfilId: PERFIL }, CONTEXTO_PUBLICO);

    expect(historial.map((t) => t.torneoNombre)).toEqual(['Nueva', 'Media', 'Vieja']);
  });

  /** Un torneo sin fecha cargada no puede encabezar el historial. */
  it('manda al final los torneos sin fecha, y desempata por nombre', async () => {
    mockearDb([
      filaCruda({ torneo_nombre: 'Sin fecha B', fecha_inicio: null }),
      filaCruda({ torneo_nombre: 'Con fecha', fecha_inicio: new Date('2020-01-01T00:00:00.000Z') }),
      filaCruda({ torneo_nombre: 'Sin fecha A', fecha_inicio: null }),
    ]);
    const { obtenerHistorialDelJugador } = await import('./obtenerHistorialDelJugador');

    const historial = await obtenerHistorialDelJugador({ perfilId: PERFIL }, CONTEXTO_PUBLICO);

    expect(historial.map((t) => t.torneoNombre)).toEqual([
      'Con fecha',
      'Sin fecha A',
      'Sin fecha B',
    ]);
  });
});
