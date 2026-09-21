import { afterEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { esErrorDeAplicacion } from '@/lib/errores';
import { verificarSecretoDeTarea } from './_autenticacion';

const pedidoCon = (autorizacion: string | null) =>
  ({
    headers: { get: (nombre: string) => (nombre === 'authorization' ? autorizacion : null) },
  }) as unknown as NextRequest;

/** Devuelve el error lanzado, o falla si la llamada no lanzó nada. */
const errorDe = (pedido: NextRequest) => {
  try {
    verificarSecretoDeTarea(pedido);
  } catch (error) {
    if (esErrorDeAplicacion(error)) return error;
    throw error;
  }
  throw new Error('se esperaba que verificarSecretoDeTarea lanzara');
};

const codigoDelError = (pedido: NextRequest): string => errorDe(pedido).codigo;

describe('verificarSecretoDeTarea', () => {
  const original = process.env.CRON_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('deja pasar el pedido cuando la cabecera trae el secreto', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(() => verificarSecretoDeTarea(pedidoCon('Bearer un-secreto'))).not.toThrow();
  });

  it('rechaza con SIN_PERMISO cuando el secreto no coincide', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(codigoDelError(pedidoCon('Bearer otro-secreto'))).toBe('SIN_PERMISO');
  });

  it('rechaza con SIN_PERMISO cuando no viene cabecera', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(codigoDelError(pedidoCon(null))).toBe('SIN_PERMISO');
  });

  /**
   * La distinción que hace falta para diagnosticar: el despliegue sin la
   * variable cargada no es un problema de permisos de quien llama, y
   * confundirlo con uno manda a revisar el valor guardado en vez del
   * hosting.
   */
  it('rechaza con SECRETO_DE_TAREA_NO_CONFIGURADO cuando el despliegue no tiene la variable', () => {
    delete process.env.CRON_SECRET;
    expect(codigoDelError(pedidoCon('Bearer lo-que-sea'))).toBe('SECRETO_DE_TAREA_NO_CONFIGURADO');
  });

  it('no deja pasar un secreto vacío haciéndolo pasar por configurado', () => {
    process.env.CRON_SECRET = '';
    expect(codigoDelError(pedidoCon('Bearer '))).toBe('SECRETO_DE_TAREA_NO_CONFIGURADO');
  });
});

/**
 * El detalle del 403 es lo que permite diagnosticar a un cliente que no
 * se puede inspeccionar desde afuera, como `pg_net`. Lo que se describe
 * es siempre la cabecera que mandó quien llama, nunca el secreto.
 */
describe('el detalle del rechazo describe la cabecera recibida', () => {
  const original = process.env.CRON_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('avisa cuando no llegó ninguna cabecera', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(errorDe(pedidoCon(null)).detalle).toEqual({ llegoLaCabecera: false });
  });

  it('distingue una cabecera sin el prefijo Bearer', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(errorDe(pedidoCon('un-secreto')).detalle).toMatchObject({
      llegoLaCabecera: true,
      empiezaConBearer: false,
    });
  });

  it('informa los dos largos para comparar un valor recortado', () => {
    process.env.CRON_SECRET = 'un-secreto-largo';
    expect(errorDe(pedidoCon('Bearer un-secreto')).detalle).toMatchObject({
      largoDelValor: 'un-secreto'.length,
      largoEsperado: 'un-secreto-largo'.length,
    });
  });

  it('delata un salto de línea pegado al valor', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(errorDe(pedidoCon('Bearer un-secreto\n')).detalle).toMatchObject({
      coincideAlRecortarEspacios: true,
    });
  });

  it('no filtra el secreto en el detalle', () => {
    process.env.CRON_SECRET = 'un-secreto';
    expect(JSON.stringify(errorDe(pedidoCon('Bearer otra-cosa')).detalle)).not.toContain(
      'un-secreto',
    );
  });
});
