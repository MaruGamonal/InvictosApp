import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

function mockearDb(candidatos: string[]) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.trim().startsWith('SELECT p.id')) {
          return { rows: candidatos.map((id) => ({ id })) };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('confirmarResultadosVencidos', () => {
  it('sin partidos vencidos, no procesa nada', async () => {
    mockearDb([]);
    const { confirmarResultadosVencidos } = await import('./confirmarResultadosVencidos');

    const resumen = await confirmarResultadosVencidos();

    expect(resumen).toEqual({ procesados: 0, cambiados: 0, fallidos: [] });
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

    expect(resumen).toEqual({ procesados: 2, cambiados: 2, fallidos: [] });
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
});
