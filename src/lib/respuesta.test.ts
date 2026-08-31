import { describe, expect, it } from 'vitest';
import { comoRespuestaHttp } from './respuesta';
import { crearError } from './errores';

describe('comoRespuestaHttp', () => {
  it('responde { ok: true, data } cuando el handler resuelve', async () => {
    const respuesta = await comoRespuestaHttp(async () => ({ saludo: 'hola' }));
    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual({ ok: true, data: { saludo: 'hola' } });
  });

  it('traduce un ErrorDeAplicacion a su código y su HTTP exactos', async () => {
    const respuesta = await comoRespuestaHttp(async () => {
      throw crearError('CUPO_COMPLETO');
    });
    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.ok).toBe(false);
    expect(cuerpo.error.codigo).toBe('CUPO_COMPLETO');
    expect(cuerpo.error.mensaje).toContain('cupo');
  });

  it('un error no controlado se traduce a ERROR_INTERNO 500 sin exponer nada del interior', async () => {
    const respuesta = await comoRespuestaHttp(async () => {
      throw new Error('detalle interno secreto de la base de datos');
    });
    expect(respuesta.status).toBe(500);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({
      ok: false,
      error: { codigo: 'ERROR_INTERNO', mensaje: expect.any(String) },
    });
    expect(JSON.stringify(cuerpo)).not.toContain('secreto');
  });
});
