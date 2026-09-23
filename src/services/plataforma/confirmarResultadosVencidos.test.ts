import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

function mockearDb(candidatos: string[]) {
  const consultas: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      // El servicio pide `LIMIT $1`; el mock lo respeta para que el
      // recorte del lote se ejercite de verdad y no solo en el SQL.
      query: async (texto: string, parametros?: unknown[]) => {
        consultas.push(texto.trim());
        if (texto.trim().startsWith('SELECT p.id')) {
          const limite = typeof parametros?.[0] === 'number' ? parametros[0] : candidatos.length;
          return { rows: candidatos.slice(0, limite).map((id) => ({ id })) };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('confirmarResultadosVencidos', () => {
  it('sin partidos vencidos, no procesa nada', async () => {
    mockearDb([]);
    const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

    const resumen = await confirmarResultadosVencidos();

    expect(resumen).toEqual({
      procesados: 0,
      cambiados: 0,
      fallidos: [],
      pendientes: 0,
      puedeHaberMas: false,
    });
  });

  it('confirma cada partido vencido con contexto de sistema', async () => {
    mockearDb(['p1', 'p2']);
    const confirmar = vi.fn(async () => ({
      estadoResultado: 'confirmed',
      confirmadoPorVencimiento: true,
    }));
    vi.doMock('@/services/competencia/confirmarResultado', () => ({
      confirmarResultado: confirmar,
    }));
    const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

    const resumen = await confirmarResultadosVencidos();

    expect(resumen).toEqual({
      procesados: 2,
      cambiados: 2,
      fallidos: [],
      pendientes: 0,
      puedeHaberMas: false,
    });
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(confirmar).toHaveBeenCalledWith(
      { partidoId: 'p1' },
      expect.objectContaining({ esSistema: true }),
    );
  });

  it('un partido que falla no interrumpe a los demás, y queda registrado en fallidos', async () => {
    mockearDb(['p1', 'p2', 'p3']);
    const { crearError } = await import('@/lib/errores');
    const confirmar = vi.fn(async (input: { partidoId: string }) => {
      if (input.partidoId === 'p2') throw crearError('RESULTADO_NO_CONFIRMABLE');
      return { estadoResultado: 'confirmed', confirmadoPorVencimiento: true };
    });
    vi.doMock('@/services/competencia/confirmarResultado', () => ({
      confirmarResultado: confirmar,
    }));
    const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

    const resumen = await confirmarResultadosVencidos();

    expect(resumen.procesados).toBe(3);
    expect(resumen.cambiados).toBe(2);
    expect(resumen.fallidos).toEqual([{ partidoId: 'p2', error: 'RESULTADO_NO_CONFIRMABLE' }]);
  });

  it('también confirma sin esperar 72 horas si el torneo relámpago ya terminó (`06`, D-100)', async () => {
    const consultas = mockearDb([]);
    const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

    await confirmarResultadosVencidos();

    const consulta = consultas.find((c) => c.startsWith('SELECT p.id'));
    expect(consulta).toContain("t.estado = 'finished'");
    expect(consulta).toContain('(t.fecha_fin_estimada::date - t.fecha_inicio_estimada::date) <= 2');
    expect(consulta).toContain("p.fecha_carga_resultado < now() - interval '72 hours'");
  });

  /**
   * El incidente real: el bucle recorría todo lo vencido sin límite, la
   * corrida se pasaba del tiempo de la función y la plataforma la
   * mataba en el medio. Sentry lo veía como *timeout check-in* — el
   * aviso de arranque llegaba, el de fin nunca.
   */
  describe('tope y presupuesto', () => {
    it('pide un lote acotado, no todo lo vencido', async () => {
      const consultas = mockearDb([]);
      const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

      await confirmarResultadosVencidos();

      const consulta = consultas.find((c) => c.startsWith('SELECT p.id'));
      expect(consulta).toContain('LIMIT $1');
      // Más viejo primero: así el atraso se drena en orden y ninguno
      // queda postergado para siempre.
      expect(consulta).toContain('ORDER BY p.fecha_carga_resultado ASC');
    });

    it('con más vencidos que el tope, procesa el lote y avisa que quedan más', async () => {
      mockearDb(Array.from({ length: 250 }, (_, i) => `p${i}`));
      vi.doMock('@/services/competencia/confirmarResultado', () => ({
        confirmarResultado: vi.fn(async () => ({
          estadoResultado: 'confirmed',
          confirmadoPorVencimiento: true,
        })),
      }));
      const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

      const resumen = await confirmarResultadosVencidos();

      expect(resumen.procesados).toBe(200);
      expect(resumen.puedeHaberMas).toBe(true);
    });

    /**
     * Cortar a tiempo solo es aceptable porque reintentar es seguro: el
     * partido que quedó sigue en `loaded` y lo toma la corrida
     * siguiente. Confirmar una hora más tarde es mucho mejor que no
     * confirmar ninguno y encima no enterarse.
     */
    it('agotado el presupuesto, corta y dice cuántos quedaron', async () => {
      mockearDb(['p1', 'p2', 'p3', 'p4']);
      let reloj = 0;
      // Cada confirmación "tarda" 20 segundos de reloj de pared.
      vi.spyOn(Date, 'now').mockImplementation(() => reloj);
      vi.doMock('@/services/competencia/confirmarResultado', () => ({
        confirmarResultado: vi.fn(async () => {
          reloj += 20_000;
          return { estadoResultado: 'confirmed', confirmadoPorVencimiento: true };
        }),
      }));
      const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

      const resumen = await confirmarResultadosVencidos();

      // 0s → p1, 20s → p2, 40s → p3, 60s > 45s de presupuesto: corta.
      expect(resumen.procesados).toBe(3);
      expect(resumen.pendientes).toBe(1);
      expect(resumen.puedeHaberMas).toBe(false);

      vi.mocked(Date.now).mockRestore();
    });

    /** Una transacción cortada por la mitad sería peor que llegar tarde. */
    it('el corte cae entre confirmaciones, nunca dentro de una', async () => {
      mockearDb(['p1', 'p2']);
      let reloj = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => reloj);
      const enCurso: string[] = [];
      const terminados: string[] = [];
      vi.doMock('@/services/competencia/confirmarResultado', () => ({
        confirmarResultado: vi.fn(async (input: { partidoId: string }) => {
          enCurso.push(input.partidoId);
          reloj += 60_000;
          terminados.push(input.partidoId);
          return { estadoResultado: 'confirmed', confirmadoPorVencimiento: true };
        }),
      }));
      const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

      await confirmarResultadosVencidos();

      expect(enCurso).toEqual(terminados);

      vi.mocked(Date.now).mockRestore();
    });
  });
});
