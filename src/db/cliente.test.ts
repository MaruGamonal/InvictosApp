import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

/**
 * El pool se crea una sola vez por proceso, así que cada caso necesita
 * el módulo recién importado.
 */
async function cargarPool() {
  vi.resetModules();
  const { obtenerPool } = await import('./cliente');
  return obtenerPool();
}

const URL_ORIGINAL = process.env.DATABASE_URL;

beforeEach(() => {
  process.env.DATABASE_URL = 'postgresql://usuario:clave@127.0.0.1:5432/basededatos';
});

afterEach(() => {
  if (URL_ORIGINAL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = URL_ORIGINAL;
});

describe('obtenerPool', () => {
  /**
   * El caso que importa. `pg` emite `'error'` en el pool cuando se cae
   * una conexión **ociosa** —Supabase las corta sola cada tanto—, y un
   * `'error'` de EventEmitter sin listener no es una promesa rechazada:
   * Node lo lanza como excepción no capturada y tumba el proceso.
   *
   * Reportado en vivo como "después de guardar, el inicio y el perfil
   * fallan por unos minutos".
   */
  it('registra un listener de error: sin él, una conexión ociosa caída tumba el proceso', async () => {
    const pool = await cargarPool();
    expect(pool.listenerCount('error')).toBeGreaterThan(0);
  });

  it('el listener descarta el error en vez de dejarlo escapar', async () => {
    const pool = await cargarPool();
    // Sin listener esto sería una excepción no capturada.
    expect(() => pool.emit('error', new Error('conexión ociosa caída'), {} as never)).not.toThrow();
  });

  it('limita las conexiones por instancia: en Vercel cada una abre su propio pool', async () => {
    const pool = await cargarPool();
    expect(pool.options.max).toBe(5);
  });

  it('devuelve rápido las conexiones ociosas y no cuelga esperando una libre', async () => {
    const pool = await cargarPool();
    expect(pool.options.idleTimeoutMillis).toBe(10_000);
    expect(pool.options.connectionTimeoutMillis).toBe(5_000);
  });

  it('es el mismo pool en cada llamada: nunca uno por servicio', async () => {
    vi.resetModules();
    const { obtenerPool } = await import('./cliente');
    expect(obtenerPool()).toBe(obtenerPool());
  });

  it('sin DATABASE_URL falla al construirlo, no al primer query', async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { obtenerPool } = await import('./cliente');
    expect(() => obtenerPool()).toThrow(/DATABASE_URL/);
  });
});
