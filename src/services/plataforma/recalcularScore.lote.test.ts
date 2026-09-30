import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

vi.mock('@/lib/cache', () => ({ invalidarCacheEquipo: vi.fn() }));

/**
 * Devuelve `cantidad` equipos activos, respetando el `LIMIT $1` que
 * pide el servicio para que el recorte del lote se ejercite de verdad.
 * El resto de las consultas (partidos, posiciones, upsert) devuelven
 * vacío: acá lo que se prueba es el lote, no la fórmula.
 */
function mockearDb(cantidad: number) {
  const consultas: Array<{ sql: string; parametros: unknown[] }> = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, parametros: unknown[] = []) => {
        const sql = texto.trim();
        consultas.push({ sql, parametros });
        if (sql.startsWith('SELECT e.id')) {
          const limite = typeof parametros[0] === 'number' ? parametros[0] : cantidad;
          return {
            rows: Array.from({ length: Math.min(cantidad, limite) }, (_, i) => ({
              id: `equipo-${i}`,
            })),
          };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('recalcularScore: el lote', () => {
  it('sin equipos activos, no procesa nada', async () => {
    mockearDb(0);
    const { recalcularScore } = await import('./recalcularScore');

    expect(await recalcularScore()).toEqual({
      procesados: 0,
      cambiados: 0,
      fallidos: [],
      pendientes: 0,
      puedeHaberMas: false,
    });
  });

  /**
   * El orden es lo que hace que recortar no pierda a nadie: el que hace
   * más que no se recalcula va primero, y el que nunca se calculó
   * —todavía sin fila en `score_equipo`— va antes que todos.
   */
  it('pide los equipos por antigüedad del último recálculo, los nuevos primero', async () => {
    const consultas = mockearDb(0);
    const { recalcularScore } = await import('./recalcularScore');

    await recalcularScore();

    const seleccion = consultas[0]!.sql;
    expect(seleccion).toContain('LEFT JOIN score_equipo');
    expect(seleccion).toContain('ORDER BY s.ultima_actualizacion ASC NULLS FIRST');
    expect(seleccion).toContain('LIMIT $1');
  });

  it('procesa todos cuando entran en una corrida', async () => {
    mockearDb(30);
    const { recalcularScore } = await import('./recalcularScore');

    const resumen = await recalcularScore();

    expect(resumen.procesados).toBe(30);
    expect(resumen.cambiados).toBe(30);
    expect(resumen.puedeHaberMas).toBe(false);
    expect(resumen.pendientes).toBe(0);
  });

  /**
   * El defecto que este cambio viene a tapar: sin lote, una tabla que
   * crece contra una función con tiempo máximo se corta a la mitad y
   * nada lo señala. Ahora corta prolijo y lo dice.
   */
  it('con más equipos que el lote, corta y avisa que puede haber más', async () => {
    mockearDb(1000);
    const { recalcularScore } = await import('./recalcularScore');

    const resumen = await recalcularScore();

    expect(resumen.procesados).toBe(200);
    expect(resumen.puedeHaberMas).toBe(true);
  });

  it('un equipo que falla no corta la corrida', async () => {
    mockearDb(3);
    vi.doMock('@/lib/cache', () => ({
      invalidarCacheEquipo: (id: string) => {
        if (id === 'equipo-1') throw new Error('falló uno');
      },
    }));
    const { recalcularScore } = await import('./recalcularScore');

    const resumen = await recalcularScore();

    expect(resumen.procesados).toBe(3);
    expect(resumen.cambiados).toBe(2);
    expect(resumen.fallidos).toEqual([{ equipoId: 'equipo-1', error: 'falló uno' }]);
  });
});
