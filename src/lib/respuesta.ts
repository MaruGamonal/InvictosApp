import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { CODIGOS_ERROR, esErrorDeAplicacion, type CodigoError } from './errores';

/** Forma única de respuesta (`10`, 2.4). */
export type RespuestaExito<T> = { ok: true; data: T };
export type RespuestaError = {
  ok: false;
  error: { codigo: CodigoError | 'ERROR_INTERNO'; mensaje: string; detalle?: unknown };
};

/**
 * Ejecuta un handler de servicio y lo traduce a una respuesta HTTP con la
 * forma única de `10`, 2.4. Ningún servicio devuelve un código HTTP: eso
 * lo decide únicamente esta función, a partir del error tipado que lanzó.
 *
 * Un error no controlado se traduce a `ERROR_INTERNO` sin exponer nada del
 * interior — ni el mensaje original ni el stack — pero sí se manda entero
 * a Sentry (T28, `09` sección 4): es la única forma de enterarse de una
 * regresión que los tests no cubrieron. Un error de aplicación (`esErrorDeAplicacion`)
 * no se reporta: ya es un caso de negocio esperado, no una falla.
 */
export async function comoRespuestaHttp<T>(handler: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await handler();
    return NextResponse.json<RespuestaExito<T>>({ ok: true, data });
  } catch (error) {
    if (esErrorDeAplicacion(error)) {
      const body: RespuestaError = {
        ok: false,
        error: { codigo: error.codigo, mensaje: error.message, detalle: error.detalle },
      };
      return NextResponse.json(body, { status: error.httpStatus });
    }

    Sentry.captureException(error);

    const body: RespuestaError = {
      ok: false,
      error: { codigo: 'ERROR_INTERNO', mensaje: CODIGOS_ERROR.ERROR_INTERNO.mensaje },
    };
    return NextResponse.json(body, { status: CODIGOS_ERROR.ERROR_INTERNO.httpStatus });
  }
}
