import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const LIMITE = { maximoIntentos: 3, ventanaMs: 1000 };

const capturarMensaje = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => capturarMensaje(...args),
}));

/**
 * La base devuelve el conteo; acá se simula con la misma ventana
 * deslizante, para probar que el módulo **usa** lo que la base le dice.
 */
function pgQueFunciona() {
  const porClave = new Map<string, number[]>();
  const query = vi.fn(async (_sql: string, parametros: unknown[]) => {
    const [clave, ventanaMs, ahora] = parametros as [string, number, number];
    const vigentes = (porClave.get(clave) ?? []).filter((m) => m > ahora - ventanaMs);
    vigentes.push(ahora);
    porClave.set(clave, vigentes);
    return { rows: [{ intentos: vigentes.length }] };
  });
  vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
  return query;
}

function pgCaido(motivo = new Error('sin conexión')) {
  const query = vi.fn(async () => {
    throw motivo;
  });
  vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
  return query;
}

beforeEach(() => {
  vi.resetModules();
  capturarMensaje.mockClear();
});

afterEach(() => {
  vi.doUnmock('@/db/cliente');
});

describe('verificarLimite, contra la base', () => {
  it('permite hasta el máximo de intentos dentro de la ventana', async () => {
    pgQueFunciona();
    const { verificarLimite } = await import('./limiteFrecuencia');

    expect(await verificarLimite('a@example.com', LIMITE, 0)).toBe(true);
    expect(await verificarLimite('a@example.com', LIMITE, 100)).toBe(true);
    expect(await verificarLimite('a@example.com', LIMITE, 200)).toBe(true);
  });

  it('rechaza el intento que supera el límite', async () => {
    pgQueFunciona();
    const { verificarLimite } = await import('./limiteFrecuencia');

    await verificarLimite('a@example.com', LIMITE, 0);
    await verificarLimite('a@example.com', LIMITE, 100);
    await verificarLimite('a@example.com', LIMITE, 200);
    expect(await verificarLimite('a@example.com', LIMITE, 300)).toBe(false);
  });

  it('cada clave tiene su propio contador', async () => {
    pgQueFunciona();
    const { verificarLimite } = await import('./limiteFrecuencia');

    await verificarLimite('a@example.com', LIMITE, 0);
    await verificarLimite('a@example.com', LIMITE, 0);
    await verificarLimite('a@example.com', LIMITE, 0);
    expect(await verificarLimite('b@example.com', LIMITE, 0)).toBe(true);
  });

  it('libera intentos a medida que la ventana avanza', async () => {
    pgQueFunciona();
    const { verificarLimite } = await import('./limiteFrecuencia');

    await verificarLimite('a@example.com', LIMITE, 0);
    await verificarLimite('a@example.com', LIMITE, 100);
    await verificarLimite('a@example.com', LIMITE, 200);
    expect(await verificarLimite('a@example.com', LIMITE, 300)).toBe(false);

    // Pasó la ventana completa desde todos los intentos anteriores: vuelve a haber lugar.
    expect(await verificarLimite('a@example.com', LIMITE, 1500)).toBe(true);
  });

  /** El conteo compartido es el punto entero del cambio: tiene que ser el que manda. */
  it('usa el conteo de la base, no uno propio', async () => {
    const query = vi.fn(async () => ({ rows: [{ intentos: 99 }] }));
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
    const { verificarLimite } = await import('./limiteFrecuencia');

    // Primer intento de este proceso, pero la base dice que ya van 99.
    expect(await verificarLimite('otra-instancia', LIMITE, 0)).toBe(false);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('registrar_intento_limitado'), [
      'otra-instancia',
      1000,
      0,
    ]);
  });
});

describe('verificarLimite, con la base caída', () => {
  it('cae al conteo en memoria en vez de negar el acceso', async () => {
    pgCaido();
    const { verificarLimite } = await import('./limiteFrecuencia');

    expect(await verificarLimite('a@example.com', LIMITE, 0)).toBe(true);
    expect(await verificarLimite('a@example.com', LIMITE, 100)).toBe(true);
    expect(await verificarLimite('a@example.com', LIMITE, 200)).toBe(true);
    // Degradado a por-instancia, pero sigue frenando al que reintenta en bucle.
    expect(await verificarLimite('a@example.com', LIMITE, 300)).toBe(false);
  });

  /**
   * Sin esto el límite dejaría de ser compartido en silencio, que es
   * justo el problema que este cambio vino a resolver.
   */
  it('reporta la caída a Sentry, una sola vez por proceso', async () => {
    pgCaido();
    const { verificarLimite } = await import('./limiteFrecuencia');

    await verificarLimite('a@example.com', LIMITE, 0);
    await verificarLimite('b@example.com', LIMITE, 0);
    await verificarLimite('c@example.com', LIMITE, 0);

    expect(capturarMensaje).toHaveBeenCalledTimes(1);
    expect(capturarMensaje).toHaveBeenCalledWith(
      expect.stringContaining('cayó al conteo en memoria'),
      'warning',
    );
  });

  /** La función podría no existir todavía: una migración sin correr no es "cero intentos". */
  it('una respuesta sin conteo también cae al respaldo', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
    const { verificarLimite } = await import('./limiteFrecuencia');

    await verificarLimite('a@example.com', LIMITE, 0);
    await verificarLimite('a@example.com', LIMITE, 100);
    await verificarLimite('a@example.com', LIMITE, 200);
    expect(await verificarLimite('a@example.com', LIMITE, 300)).toBe(false);
    expect(capturarMensaje).toHaveBeenCalledTimes(1);
  });
});
