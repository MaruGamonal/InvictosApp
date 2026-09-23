import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

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

  /**
   * Reportado en vivo: `EMAXCONNSESSION: max clients reached in session
   * mode - max clients are limited to pool_size: 15`.
   *
   * En modo sesión cada conexión se queda con un lugar del pooler
   * mientras viva. Con 5 por instancia alcanzaban tres instancias
   * simultáneas para agotar los 15 y que la siguiente persona recibiera
   * un error en vez de una página.
   */
  describe('modo de conexión', () => {
    const POOLER_SESION =
      'postgresql://postgres.abc:clave@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';
    const POOLER_TRANSACCION =
      'postgresql://postgres.abc:clave@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

    it('reconoce los tres modos por la URL', async () => {
      vi.resetModules();
      const { detectarModoDeConexion } = await import('./cliente');
      expect(detectarModoDeConexion(POOLER_SESION)).toBe('sesion');
      expect(detectarModoDeConexion(POOLER_TRANSACCION)).toBe('transaccion');
      expect(detectarModoDeConexion('postgresql://u:c@db.abc.supabase.co:5432/postgres')).toBe(
        'directa',
      );
    });

    it('una URL rota no rompe el arranque: se trata como conexión directa', async () => {
      vi.resetModules();
      const { detectarModoDeConexion } = await import('./cliente');
      expect(detectarModoDeConexion('no es una url')).toBe('directa');
    });

    it('en modo sesión abre muchas menos conexiones por instancia', async () => {
      process.env.DATABASE_URL = POOLER_SESION;
      const pool = await cargarPool();
      expect(pool.options.max).toBe(2);
    });

    it('en modo transacción el lugar se ocupa por consulta, así que no hace falta recortar', async () => {
      process.env.DATABASE_URL = POOLER_TRANSACCION;
      const pool = await cargarPool();
      expect(pool.options.max).toBe(5);
    });

    /**
     * El síntoma no se parece a la causa: páginas que fallan de a ratos
     * cuando hay varias personas a la vez. Sin este aviso hay que
     * deducirlo del error, que no nombra la configuración.
     */
    it('avisa una sola vez que la URL está en modo sesión, sin mandar la URL', async () => {
      process.env.DATABASE_URL = POOLER_SESION;
      const Sentry = await import('@sentry/nextjs');
      vi.mocked(Sentry.captureMessage).mockClear();

      vi.resetModules();
      const { obtenerPool } = await import('./cliente');
      obtenerPool();
      obtenerPool();

      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
      const [mensaje] = vi.mocked(Sentry.captureMessage).mock.calls[0]!;
      expect(mensaje).toContain('6543');
      expect(mensaje).not.toContain('clave');
    });

    it('en modo transacción no avisa nada', async () => {
      process.env.DATABASE_URL = POOLER_TRANSACCION;
      const Sentry = await import('@sentry/nextjs');
      vi.mocked(Sentry.captureMessage).mockClear();

      await cargarPool();

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
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
