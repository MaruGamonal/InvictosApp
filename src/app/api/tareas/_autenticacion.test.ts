import { afterEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { esErrorDeAplicacion } from '@/lib/errores';
import { verificarSecretoDeTarea } from './_autenticacion';

const pedidoCon = (autorizacion: string | null) =>
  ({
    headers: { get: (nombre: string) => (nombre === 'authorization' ? autorizacion : null) },
  }) as unknown as NextRequest;

/** Devuelve el código del error, o falla si la llamada no lanzó nada. */
const codigoDelError = (pedido: NextRequest): string => {
  try {
    verificarSecretoDeTarea(pedido);
  } catch (error) {
    if (esErrorDeAplicacion(error)) return error.codigo;
    throw error;
  }
  throw new Error('se esperaba que verificarSecretoDeTarea lanzara');
};

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
