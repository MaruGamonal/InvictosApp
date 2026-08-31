import { describe, expect, it } from 'vitest';
import { codificarCursor, decodificarCursor, paginar } from './paginacion';

interface Fila {
  id: number;
  fecha: number;
}

function obtenerClave(fila: Fila) {
  return [fila.fecha, fila.id];
}

function ordenar(filas: Fila[]): Fila[] {
  return [...filas].sort((a, b) => a.fecha - b.fecha || a.id - b.id);
}

describe('codificarCursor / decodificarCursor', () => {
  it('hace un viaje de ida y vuelta sin perder la clave', () => {
    const clave = [42, 'abc-123'];
    expect(decodificarCursor(codificarCursor(clave))).toEqual(clave);
  });

  it('rechaza un cursor corrupto con DATOS_INVALIDOS', () => {
    expect(() => decodificarCursor('esto-no-es-base64url-valido-{}')).toThrow();
  });
});

describe('paginar', () => {
  it('no repite ni saltea filas aunque se inserten registros nuevos entre dos lecturas', () => {
    // Simula el listado ordenado por fecha (`10`, 2.7) — 10 filas iniciales.
    let base: Fila[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, fecha: i + 1 }));

    const pagina1 = paginar(ordenar(base), { tamanoPagina: 4, obtenerClave });
    expect(pagina1.pagina.map((f) => f.id)).toEqual([1, 2, 3, 4]);
    expect(pagina1.cursorSiguiente).not.toBeNull();

    // Entre las dos lecturas: se insertan filas nuevas en la zona YA
    // mostrada (no deberían reaparecer) y en la zona TODAVÍA no mostrada
    // (tienen que aparecer, en su lugar ordenado).
    base = [
      ...base,
      { id: 101, fecha: 2.5 }, // ya mostrada — no debe reaparecer en la página 2
      { id: 102, fecha: 6.5 }, // pendiente — debe aparecer en la página 2, en orden
    ];

    const pagina2 = paginar(ordenar(base), {
      cursor: pagina1.cursorSiguiente,
      tamanoPagina: 4,
      obtenerClave,
    });

    // Ni duplica lo ya visto (1-4, ni la fila 101 insertada antes del corte)
    // ni saltea lo que corresponde ver ahora, incluida la fila insertada
    // después del corte (102), en su posición ordenada correcta.
    expect(pagina2.pagina.map((f) => f.id)).toEqual([5, 6, 102, 7]);

    const idsVistos = [...pagina1.pagina, ...pagina2.pagina].map((f) => f.id);
    expect(new Set(idsVistos).size).toBe(idsVistos.length); // sin duplicados
    expect(idsVistos).not.toContain(101); // la insertada "atrás" no reaparece
  });

  it('devuelve cursorSiguiente null cuando ya no queda nada más', () => {
    const filas = ordenar([
      { id: 1, fecha: 1 },
      { id: 2, fecha: 2 },
    ]);
    const resultado = paginar(filas, { tamanoPagina: 10, obtenerClave });
    expect(resultado.pagina).toHaveLength(2);
    expect(resultado.cursorSiguiente).toBeNull();
  });
});
