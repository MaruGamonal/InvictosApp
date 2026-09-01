import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import {
  aplicarEfectoAUnEquipo,
  aplicarResultadoAPosicion,
  revertirEfectoDePosicion,
} from './_recalcularPosicion';

const GRUPO = 'grupo-1';
const EQUIPO_A = 'equipo-a';
const EQUIPO_B = 'equipo-b';
const PUNTAJES = { puntosVictoria: 3, puntosEmpate: 1, puntosDerrota: 0 };

function crearClienteFalso() {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  const cliente = {
    query: vi.fn(async (texto: string, valores: unknown[] = []) => {
      consultas.push({ texto, valores });
      return { rows: [] };
    }),
  } as unknown as PoolClient;
  return { cliente, consultas };
}

describe('aplicarResultadoAPosicion', () => {
  it('carga fresca: aplica el efecto completo de la victoria y la derrota', async () => {
    const { cliente, consultas } = crearClienteFalso();

    await aplicarResultadoAPosicion(cliente, GRUPO, EQUIPO_A, EQUIPO_B, 2, 1, null, null, PUNTAJES);

    expect(consultas).toHaveLength(2);
    expect(consultas[0]!.valores).toEqual([GRUPO, EQUIPO_A, 3, 1, 1, 0, 0, 2, 1, 1]);
    expect(consultas[1]!.valores).toEqual([GRUPO, EQUIPO_B, 0, 1, 0, 0, 1, 1, 2, -1]);
  });

  it('empate: reparte el punto configurado a los dos equipos', async () => {
    const { cliente, consultas } = crearClienteFalso();

    await aplicarResultadoAPosicion(cliente, GRUPO, EQUIPO_A, EQUIPO_B, 1, 1, null, null, PUNTAJES);

    expect(consultas[0]!.valores).toEqual([GRUPO, EQUIPO_A, 1, 1, 0, 1, 0, 1, 1, 0]);
    expect(consultas[1]!.valores).toEqual([GRUPO, EQUIPO_B, 1, 1, 0, 1, 0, 1, 1, 0]);
  });

  it('corrección: el delta es la diferencia entre el nuevo efecto y el anterior, partidos_jugados neto cero', async () => {
    const { cliente, consultas } = crearClienteFalso();

    // 2-1 (victoria local) corregido a 2-2 (empate)
    await aplicarResultadoAPosicion(cliente, GRUPO, EQUIPO_A, EQUIPO_B, 2, 2, 2, 1, PUNTAJES);

    expect(consultas[0]!.valores).toEqual([GRUPO, EQUIPO_A, -2, 0, -1, 1, 0, 0, 1, -1]);
    expect(consultas[1]!.valores).toEqual([GRUPO, EQUIPO_B, 1, 0, 0, 1, -1, 1, 0, 1]);
  });

  it('corrección que no cambia el signo del resultado: el delta es solo la diferencia de goles', async () => {
    const { cliente, consultas } = crearClienteFalso();

    // 3-0 corregido a 2-0: sigue siendo victoria local, pero con un gol menos
    await aplicarResultadoAPosicion(cliente, GRUPO, EQUIPO_A, EQUIPO_B, 2, 0, 3, 0, PUNTAJES);

    expect(consultas[0]!.valores).toEqual([GRUPO, EQUIPO_A, 0, 0, 0, 0, 0, -1, 0, -1]);
    expect(consultas[1]!.valores).toEqual([GRUPO, EQUIPO_B, 0, 0, 0, 0, 0, 0, -1, 1]);
  });

  it('torneo con puntajes 2/1/0: usa los puntajes configurados, no el default', async () => {
    const { cliente, consultas } = crearClienteFalso();

    await aplicarResultadoAPosicion(cliente, GRUPO, EQUIPO_A, EQUIPO_B, 3, 0, null, null, {
      puntosVictoria: 2,
      puntosEmpate: 1,
      puntosDerrota: 0,
    });

    expect(consultas[0]!.valores[2]).toBe(2);
  });
});

describe('revertirEfectoDePosicion', () => {
  it('deshace exactamente el efecto anterior, sin aplicar uno nuevo (T16, walkover -> cancelled)', async () => {
    const { cliente, consultas } = crearClienteFalso();

    // el walkover había sido 3-0 a favor del local
    await revertirEfectoDePosicion(cliente, GRUPO, EQUIPO_A, EQUIPO_B, 3, 0, PUNTAJES);

    expect(consultas).toHaveLength(2);
    expect(consultas[0]!.valores).toEqual([GRUPO, EQUIPO_A, -3, -1, -1, 0, 0, -3, 0, -3]);
    expect(consultas[1]!.valores).toEqual([GRUPO, EQUIPO_B, 0, -1, 0, 0, -1, 0, -3, 3]);
  });
});

describe('aplicarEfectoAUnEquipo', () => {
  it('aplica el efecto a un solo equipo, sin tocar al rival (T17, baja con walkover al rival)', async () => {
    const { cliente, consultas } = crearClienteFalso();

    await aplicarEfectoAUnEquipo(cliente, GRUPO, EQUIPO_A, 3, 0, PUNTAJES);

    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.valores).toEqual([GRUPO, EQUIPO_A, 3, 1, 1, 0, 0, 3, 0, 3]);
  });
});
