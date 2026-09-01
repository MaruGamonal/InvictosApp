import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { cerrarTorneoSiCupoCompleto, promoverListaDeEspera } from './_cupo';

function clienteFalso(respuestas: Record<string, unknown>) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  const cliente = {
    query: vi.fn(async (texto: string, valores: unknown[] = []) => {
      consultas.push({ texto: texto.trim(), valores });
      for (const [patron, resultado] of Object.entries(respuestas)) {
        if (texto.includes(patron)) return resultado;
      }
      return { rows: [] };
    }),
  } as unknown as PoolClient;
  return { cliente, consultas };
}

describe('cerrarTorneoSiCupoCompleto', () => {
  it('cierra el torneo cuando los aprobados alcanzan el cupo', async () => {
    const { cliente, consultas } = clienteFalso({
      'SELECT t.cupo_equipos': { rows: [{ cupo_equipos: 8, aprobados: '8' }] },
    });
    await cerrarTorneoSiCupoCompleto(cliente, 'torneo-1');
    expect(consultas.some((c) => c.texto.startsWith('UPDATE torneo'))).toBe(true);
  });

  it('no cierra el torneo si todavía hay vacantes', async () => {
    const { cliente, consultas } = clienteFalso({
      'SELECT t.cupo_equipos': { rows: [{ cupo_equipos: 8, aprobados: '5' }] },
    });
    await cerrarTorneoSiCupoCompleto(cliente, 'torneo-1');
    expect(consultas.some((c) => c.texto.startsWith('UPDATE torneo'))).toBe(false);
  });
});

describe('promoverListaDeEspera', () => {
  it('promueve al primero de la lista de espera', async () => {
    const { cliente, consultas } = clienteFalso({
      "estado = 'waitlisted'": {
        rows: [{ equipo_id: 'equipo-1' }],
      },
    });
    const resultado = await promoverListaDeEspera(cliente, 'torneo-1');
    expect(resultado).toBe('equipo-1');
    expect(consultas.some((c) => c.texto.startsWith('UPDATE inscripcion'))).toBe(true);
  });

  it('sin nadie en lista de espera, no hace nada', async () => {
    const { cliente, consultas } = clienteFalso({});
    const resultado = await promoverListaDeEspera(cliente, 'torneo-1');
    expect(resultado).toBeNull();
    expect(consultas.some((c) => c.texto.startsWith('UPDATE inscripcion'))).toBe(false);
  });
});
