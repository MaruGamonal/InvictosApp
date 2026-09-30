import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));

/**
 * Devuelve `cantidad` filas pendientes, respetando el `LIMIT $1` que
 * pide el servicio, para que el recorte del lote se ejercite de verdad.
 */
function mockearDb(cantidad: number) {
  const consultas: Array<{ sql: string; parametros: unknown[] }> = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, parametros: unknown[] = []) => {
        consultas.push({ sql: texto.trim(), parametros });
        if (texto.trim().startsWith('SELECT id, usuario_id, tipo')) {
          const limite = typeof parametros[0] === 'number' ? parametros[0] : cantidad;
          return {
            rows: Array.from({ length: Math.min(cantidad, limite) }, (_, i) => ({
              id: `notif-${i}`,
              usuario_id: `usr-${i}`,
              tipo: 'team_invitation',
              entidad_origen_tipo: 'equipo',
              entidad_origen_id: 'eq-1',
            })),
          };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('despacharCorreosPendientes', () => {
  it('sin correos pendientes, no despacha nada', async () => {
    mockearDb(0);
    vi.doMock('./_despachoDeCorreo', () => ({
      MAXIMO_INTENTOS: 5,
      despacharFilas: vi.fn(),
    }));
    const { despacharCorreosPendientes } = await import('./despacharCorreosPendientes');

    const resumen = await despacharCorreosPendientes();

    expect(resumen).toEqual({
      enviados: 0,
      fallidos: 0,
      omitidos: 0,
      pendientes: 0,
      puedeHaberMas: false,
    });
  });

  /**
   * La consulta tiene que filtrar por los dos topes. Sin el de
   * intentos, una casilla inexistente se reintenta para siempre; sin el
   * de antigüedad, alguien recibe el jueves el aviso del partido del
   * domingo pasado.
   */
  it('sólo toma pendientes de email, con tope de intentos y de antigüedad', async () => {
    const consultas = mockearDb(0);
    vi.doMock('./_despachoDeCorreo', () => ({ MAXIMO_INTENTOS: 5, despacharFilas: vi.fn() }));
    const { despacharCorreosPendientes } = await import('./despacharCorreosPendientes');

    await despacharCorreosPendientes();

    const seleccion = consultas[0]!.sql;
    expect(seleccion).toContain("canal = 'email'");
    expect(seleccion).toContain("estado IN ('pending', 'failed')");
    expect(seleccion).toContain('intentos < $2');
    expect(seleccion).toContain("fecha_generacion > now() - ($3 || ' days')::interval");
    expect(consultas[0]!.parametros[1]).toBe(5);
  });

  it('suma lo que despacha cada tanda', async () => {
    mockearDb(25);
    vi.doMock('./_despachoDeCorreo', () => ({
      MAXIMO_INTENTOS: 5,
      despacharFilas: vi.fn(async (_pool: unknown, filas: unknown[]) => ({
        enviados: filas.length,
        fallidos: 0,
        omitidos: 0,
      })),
    }));
    const { despacharCorreosPendientes } = await import('./despacharCorreosPendientes');

    const resumen = await despacharCorreosPendientes();

    expect(resumen.enviados).toBe(25);
    expect(resumen.pendientes).toBe(0);
    expect(resumen.puedeHaberMas).toBe(false);
  });

  /**
   * Con más de un lote, `puedeHaberMas` tiene que decirlo. Es lo que
   * faltó en la tarea horaria y lo que hizo que un corte silencioso
   * pasara desapercibido en producción.
   */
  it('avisa cuando el lote se llenó y puede haber más', async () => {
    mockearDb(500);
    vi.doMock('./_despachoDeCorreo', () => ({
      MAXIMO_INTENTOS: 5,
      despacharFilas: vi.fn(async (_pool: unknown, filas: unknown[]) => ({
        enviados: filas.length,
        fallidos: 0,
        omitidos: 0,
      })),
    }));
    const { despacharCorreosPendientes } = await import('./despacharCorreosPendientes');

    const resumen = await despacharCorreosPendientes();

    expect(resumen.enviados).toBe(200);
    expect(resumen.puedeHaberMas).toBe(true);
  });

  it('un lote con fallos los reporta y no los cuenta como enviados', async () => {
    mockearDb(10);
    vi.doMock('./_despachoDeCorreo', () => ({
      MAXIMO_INTENTOS: 5,
      despacharFilas: vi.fn(async (_pool: unknown, filas: unknown[]) => ({
        enviados: 0,
        fallidos: filas.length,
        omitidos: 0,
      })),
    }));
    const { despacharCorreosPendientes } = await import('./despacharCorreosPendientes');
    const Sentry = await import('@sentry/nextjs');

    const resumen = await despacharCorreosPendientes();

    expect(resumen).toMatchObject({ enviados: 0, fallidos: 10 });
    // Una corrida que manda cero y falla diez no "terminó bien".
    expect(Sentry.captureMessage).toHaveBeenCalled();
  });
});
