import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

interface FilaPartido {
  torneo_id: string;
  equipo_local_id: string;
  equipo_visitante_id: string;
  goles_local: number;
  goles_visitante: number;
  fecha_confirmacion_resultado: Date;
}

function mockearDb(opciones: {
  equipoIds?: string[];
  partidosPorEquipo?: Record<string, FilaPartido[]>;
  tieneHistoriaPorEquipo?: Record<string, boolean>;
  posiciones?: Array<{
    torneo_id: string;
    grupo_id: string;
    equipo_id: string;
    puntos: number;
    ajuste_puntos: number;
    diferencia_gol: number;
    goles_favor: number;
  }>;
  lanzarErrorParaEquipo?: string;
}) {
  const inserts: { valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        if (t.startsWith('INSERT INTO score_equipo')) {
          inserts.push({ valores });
          return { rows: [] };
        }
        if (t.includes("SELECT id FROM equipo WHERE estado = 'active'")) {
          return { rows: (opciones.equipoIds ?? []).map((id) => ({ id })) };
        }
        if (t.includes('FROM partido p') && t.includes('fecha_confirmacion_resultado > now()')) {
          const equipoId = valores[0] as string;
          if (equipoId === opciones.lanzarErrorParaEquipo) throw new Error('boom');
          return { rows: opciones.partidosPorEquipo?.[equipoId] ?? [] };
        }
        if (t.startsWith('SELECT 1 FROM partido')) {
          const equipoId = valores[0] as string;
          return { rows: opciones.tieneHistoriaPorEquipo?.[equipoId] ? [{}] : [] };
        }
        if (t.includes('FROM inscripcion i')) {
          return { rows: opciones.posiciones ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
  return inserts;
}

const EQUIPO = '11111111-1111-1111-1111-111111111111';
const RIVAL = '22222222-2222-2222-2222-222222222222';
const TORNEO = '33333333-3333-3333-3333-333333333333';

describe('recalcularScore', () => {
  it('sin equipos activos, no hace nada', async () => {
    mockearDb({ equipoIds: [] });
    const { recalcularScore } = await import('./recalcularScore');
    const resumen = await recalcularScore();
    expect(resumen).toEqual({ procesados: 0, cambiados: 0, fallidos: [] });
  });

  it('un equipo sin ningún resultado confirmado nunca, queda insufficient_activity', async () => {
    const inserts = mockearDb({
      equipoIds: [EQUIPO],
      partidosPorEquipo: { [EQUIPO]: [] },
      tieneHistoriaPorEquipo: { [EQUIPO]: false },
    });
    const { recalcularScore } = await import('./recalcularScore');
    const resumen = await recalcularScore();

    expect(resumen).toEqual({ procesados: 1, cambiados: 1, fallidos: [] });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.valores).toEqual([EQUIPO, 'v1-provisional', 'insufficient_activity']);
  });

  it('un equipo sin resultados en la ventana pero con historia previa, queda stale', async () => {
    const inserts = mockearDb({
      equipoIds: [EQUIPO],
      partidosPorEquipo: { [EQUIPO]: [] },
      tieneHistoriaPorEquipo: { [EQUIPO]: true },
    });
    const { recalcularScore } = await import('./recalcularScore');
    await recalcularScore();

    expect(inserts[0]!.valores).toEqual([EQUIPO, 'v1-provisional', 'stale']);
  });

  it('un equipo con partidos recientes computa ganados/empatados/perdidos y queda active', async () => {
    const ahora = new Date();
    const inserts = mockearDb({
      equipoIds: [EQUIPO],
      partidosPorEquipo: {
        [EQUIPO]: [
          {
            torneo_id: TORNEO,
            equipo_local_id: EQUIPO,
            equipo_visitante_id: RIVAL,
            goles_local: 3,
            goles_visitante: 1,
            fecha_confirmacion_resultado: ahora,
          },
          {
            torneo_id: TORNEO,
            equipo_local_id: RIVAL,
            equipo_visitante_id: EQUIPO,
            goles_local: 0,
            goles_visitante: 0,
            fecha_confirmacion_resultado: ahora,
          },
          {
            torneo_id: TORNEO,
            equipo_local_id: EQUIPO,
            equipo_visitante_id: RIVAL,
            goles_local: 0,
            goles_visitante: 2,
            fecha_confirmacion_resultado: ahora,
          },
        ],
      },
    });
    const { recalcularScore } = await import('./recalcularScore');
    const resumen = await recalcularScore();

    expect(resumen).toEqual({ procesados: 1, cambiados: 1, fallidos: [] });
    expect(inserts).toHaveLength(1);
    // El quinto valor ($5) es partidos_computados — 'active' queda fijo en el SQL, no es un parámetro.
    const [equipoId, valor, desgloseJson, version, partidosComputados] = inserts[0]!.valores as [
      string,
      number,
      string,
      string,
      number,
    ];
    expect(equipoId).toBe(EQUIPO);
    expect(version).toBe('v1-provisional');
    expect(partidosComputados).toBe(3);
    expect(valor).toBeGreaterThanOrEqual(0);
    expect(valor).toBeLessThanOrEqual(100);

    const desglose = JSON.parse(desgloseJson);
    expect(desglose.partidosGanados).toBe(1);
    expect(desglose.partidosEmpatados).toBe(1);
    expect(desglose.partidosPerdidos).toBe(1);
    expect(desglose.torneosDisputados).toBe(1);
  });

  it('un torneo terminado con posición final aporta el componente de posición', async () => {
    const ahora = new Date();
    const inserts = mockearDb({
      equipoIds: [EQUIPO],
      partidosPorEquipo: {
        [EQUIPO]: [
          {
            torneo_id: TORNEO,
            equipo_local_id: EQUIPO,
            equipo_visitante_id: RIVAL,
            goles_local: 1,
            goles_visitante: 0,
            fecha_confirmacion_resultado: ahora,
          },
        ],
      },
      posiciones: [
        {
          torneo_id: TORNEO,
          grupo_id: 'grupo-1',
          equipo_id: EQUIPO,
          puntos: 10,
          ajuste_puntos: 0,
          diferencia_gol: 5,
          goles_favor: 12,
        },
        {
          torneo_id: TORNEO,
          grupo_id: 'grupo-1',
          equipo_id: RIVAL,
          puntos: 4,
          ajuste_puntos: 0,
          diferencia_gol: -5,
          goles_favor: 3,
        },
      ],
    });
    const { recalcularScore } = await import('./recalcularScore');
    await recalcularScore();

    const desglose = JSON.parse(inserts[0]!.valores[2] as string);
    expect(desglose.bonusPosicionPromedio).toBe(1);
    expect(desglose.componentePosicion).toBe(15);
  });

  it('si un equipo falla, no frena a los demás', async () => {
    mockearDb({
      equipoIds: [EQUIPO, RIVAL],
      partidosPorEquipo: { [RIVAL]: [] },
      tieneHistoriaPorEquipo: { [RIVAL]: false },
      lanzarErrorParaEquipo: EQUIPO,
    });
    const { recalcularScore } = await import('./recalcularScore');
    const resumen = await recalcularScore();

    expect(resumen.procesados).toBe(2);
    expect(resumen.cambiados).toBe(1);
    expect(resumen.fallidos).toEqual([{ equipoId: EQUIPO, error: 'boom' }]);
  });
});
