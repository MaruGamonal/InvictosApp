import { describe, expect, it } from 'vitest';
import { CODIGOS_ERROR, crearError, esErrorDeAplicacion, type CodigoError } from './errores';

describe('CODIGOS_ERROR', () => {
  const codigos = Object.keys(CODIGOS_ERROR) as CodigoError[];

  it('tiene los 6 códigos transversales y los de negocio de `10`, sección 8, más los que sumó el backlog', () => {
    // Los 24 originales de `10`, sección 8, más CUPO_MENOR_A_INSCRIPTOS
    // (T9): el catálogo original no preveía la regla de que el cupo de
    // un torneo no puede bajarse por debajo de los equipos ya
    // aprobados (`06`, A-04/D-68), así que no tenía un código para eso.
    // Más PERFIL_YA_RECLAMADO (T18) y RESULTADO_NO_CONFIRMABLE (T26):
    // mismo motivo, una regla que el catálogo original no anticipaba.
    expect(codigos).toHaveLength(26);
  });

  it.each(codigos)(
    '%s tiene un mensaje en español, sin el nombre del código ni snake_case',
    (codigo) => {
      const { mensaje, httpStatus } = CODIGOS_ERROR[codigo];
      expect(mensaje.length).toBeGreaterThan(0);
      expect(httpStatus).toBeGreaterThanOrEqual(400);
      expect(mensaje.toUpperCase()).not.toContain(codigo);
      expect(mensaje).not.toMatch(/[a-z]+_[a-z]+/); // vocabulario tipo `torneo_id`
    },
  );
});

describe('crearError', () => {
  it('arma un ErrorDeAplicacion con el httpStatus y el mensaje del código', () => {
    const error = crearError('SIN_PERMISO');
    expect(esErrorDeAplicacion(error)).toBe(true);
    expect(error.codigo).toBe('SIN_PERMISO');
    expect(error.httpStatus).toBe(403);
    expect(error.message).toBe(CODIGOS_ERROR.SIN_PERMISO.mensaje);
  });

  it('conserva el detalle para que la ruta se lo pase a la interfaz', () => {
    const detalle = [{ campo: 'nombre', problema: 'Falta' }];
    const error = crearError('DATOS_INVALIDOS', detalle);
    expect(error.detalle).toEqual(detalle);
  });
});

describe('esErrorDeAplicacion', () => {
  it('distingue un ErrorDeAplicacion de un error no controlado', () => {
    expect(esErrorDeAplicacion(crearError('NO_ENCONTRADO'))).toBe(true);
    expect(esErrorDeAplicacion(new Error('boom'))).toBe(false);
    expect(esErrorDeAplicacion('boom')).toBe(false);
  });
});
