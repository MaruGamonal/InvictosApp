import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { obtenerPool } from '@/db/cliente';
import { reiniciarLimitesDeFrecuencia, verificarLimite } from '@/lib/limiteFrecuencia';

/**
 * T27 — El límite de frecuencia contra Postgres real.
 *
 * Las pruebas unitarias simulan la base: comprueban que el módulo usa el
 * conteo que le devuelven, no que el SQL cuente bien. Lo que se verifica
 * acá es `registrar_intento_limitado` de verdad, y sobre todo lo único
 * que no se puede simular: que **dos pedidos simultáneos sobre la misma
 * clave no se cuenten cada uno sin ver al otro**. Ese era el agujero que
 * tenía el `Map` en memoria, y es el que el `pg_advisory_xact_lock` de
 * la migración cierra.
 */

const LIMITE = { maximoIntentos: 3, ventanaMs: 1000 };

/** Clave nueva por caso: la tabla es compartida y la suite no corre aislada. */
let clave: string;

beforeEach(() => {
  clave = `prueba:${randomUUID()}`;
  reiniciarLimitesDeFrecuencia();
});

afterEach(async () => {
  await obtenerPool().query('DELETE FROM intento_limitado WHERE clave LIKE $1', ['prueba:%']);
});

describe('el límite de frecuencia contra Postgres', () => {
  it('permite hasta el máximo y rechaza el siguiente', async () => {
    expect(await verificarLimite(clave, LIMITE, 0)).toBe(true);
    expect(await verificarLimite(clave, LIMITE, 100)).toBe(true);
    expect(await verificarLimite(clave, LIMITE, 200)).toBe(true);
    expect(await verificarLimite(clave, LIMITE, 300)).toBe(false);
  });

  it('libera intentos a medida que la ventana avanza', async () => {
    await verificarLimite(clave, LIMITE, 0);
    await verificarLimite(clave, LIMITE, 100);
    await verificarLimite(clave, LIMITE, 200);
    expect(await verificarLimite(clave, LIMITE, 300)).toBe(false);
    expect(await verificarLimite(clave, LIMITE, 1500)).toBe(true);
  });

  it('cada clave cuenta por su cuenta', async () => {
    const otra = `prueba:${randomUUID()}`;
    await verificarLimite(clave, LIMITE, 0);
    await verificarLimite(clave, LIMITE, 0);
    await verificarLimite(clave, LIMITE, 0);
    expect(await verificarLimite(otra, LIMITE, 0)).toBe(true);
  });

  /**
   * Lo que el `Map` no podía dar, y la razón de la función con lock.
   *
   * Diez llamadas en paralelo **no** sirven para probar esto: el pool
   * las despacha tan rápido y cada una tarda tan poco que casi nunca se
   * solapan — se verificó quitándole el lock a la función y la prueba
   * seguía pasando. Lo que sí lo prueba es forzar el solapamiento: una
   * transacción abierta retiene el lock de la clave, y la segunda
   * llamada tiene que quedarse esperando hasta que la primera cierre.
   * Sin `pg_advisory_xact_lock` la segunda contesta al instante.
   */
  it('una llamada espera a la otra cuando comparten la clave', async () => {
    const pool = obtenerPool();
    const retiene = await pool.connect();
    const espera = await pool.connect();

    try {
      await retiene.query('BEGIN');
      await retiene.query('SELECT registrar_intento_limitado($1, $2, now())', [clave, 60000]);

      let segundaTermino = false;
      const segunda = espera
        .query('SELECT registrar_intento_limitado($1, $2, now()) AS intentos', [clave, 60000])
        .then((resultado) => {
          segundaTermino = true;
          return resultado;
        });

      await new Promise((resolver) => setTimeout(resolver, 300));
      expect(
        segundaTermino,
        'la segunda llamada no esperó: la función no está serializando por clave',
      ).toBe(false);

      await retiene.query('COMMIT');
      const resultado = await segunda;
      expect(segundaTermino).toBe(true);
      // Y cuenta las dos: la suya y la de la transacción que ya cerró.
      expect(Number(resultado.rows[0]!.intentos)).toBe(2);
    } finally {
      await retiene.query('ROLLBACK').catch(() => {});
      retiene.release();
      espera.release();
    }
  });

  /** Diez a la vez: ninguna se pierde, y pasan exactamente las del límite. */
  it('no pierde intentos cuando llegan de a muchos', async () => {
    const resultados = await Promise.all(
      Array.from({ length: 10 }, () => verificarLimite(clave, LIMITE, Date.now())),
    );

    expect(resultados.filter(Boolean)).toHaveLength(LIMITE.maximoIntentos);

    const { rows } = await obtenerPool().query<{ total: string }>(
      'SELECT count(*) AS total FROM intento_limitado WHERE clave = $1',
      [clave],
    );
    // Los diez quedaron anotados: un intento rechazado también cuenta.
    expect(Number(rows[0]!.total)).toBe(10);
  });

  /** Dos claves simultáneas no se esperan entre sí: el lock es por clave. */
  it('dos claves simultáneas no se estorban', async () => {
    const otra = `prueba:${randomUUID()}`;
    const resultados = await Promise.all([
      ...Array.from({ length: 3 }, () => verificarLimite(clave, LIMITE, Date.now())),
      ...Array.from({ length: 3 }, () => verificarLimite(otra, LIMITE, Date.now())),
    ]);

    expect(resultados.every(Boolean)).toBe(true);
  });

  /** El conteo es de la base, así que lo ve cualquier instancia. */
  it('el conteo queda en la base, no en el proceso', async () => {
    await verificarLimite(clave, LIMITE, Date.now());
    await verificarLimite(clave, LIMITE, Date.now());
    await verificarLimite(clave, LIMITE, Date.now());

    // Otra instancia: proceso nuevo, memoria vacía. Si el conteo viviera
    // en el `Map`, esto daría `true` y el límite no serviría de nada.
    reiniciarLimitesDeFrecuencia();
    expect(await verificarLimite(clave, LIMITE, Date.now())).toBe(false);
  });
});
