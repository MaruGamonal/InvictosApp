import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { seguirEquipoAutomaticamente, upsertVinculo } from './_vinculo';

function clienteFalso(estadoActual: string | undefined) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  const cliente = {
    query: vi.fn(async (texto: string, valores: unknown[] = []) => {
      consultas.push({ texto, valores });
      if (texto.trim().startsWith('SELECT estado_vinculo')) {
        return { rows: estadoActual ? [{ estado_vinculo: estadoActual }] : [] };
      }
      return { rows: [] };
    }),
  } as unknown as PoolClient;
  return { cliente, consultas };
}

describe('upsertVinculo', () => {
  it('sin vínculo previo, invitar (con cuenta) inserta en invited', async () => {
    const { cliente, consultas } = clienteFalso(undefined);
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'invited',
      estadoSiSinContraparte: 'invited',
    });
    expect(resultado).toEqual({ estadoResultante: 'invited', huboCruce: false });
    expect(consultas.some((c) => c.texto.startsWith('INSERT'))).toBe(true);
  });

  it('sin vínculo previo, invitar sin cuenta pasa directo a active', async () => {
    const { cliente } = clienteFalso(undefined);
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'invited',
      estadoSiSinContraparte: 'active',
    });
    expect(resultado).toEqual({ estadoResultante: 'active', huboCruce: false });
  });

  it('invitar cuando ya existe una solicitud pendiente cruza a active (D-85)', async () => {
    const { cliente } = clienteFalso('requested');
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'invited',
      estadoSiSinContraparte: 'invited',
    });
    expect(resultado).toEqual({ estadoResultante: 'active', huboCruce: true });
  });

  it('solicitar cuando ya existe una invitación pendiente cruza a active (D-85)', async () => {
    const { cliente } = clienteFalso('invited');
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'requested',
      estadoSiSinContraparte: 'requested',
    });
    expect(resultado).toEqual({ estadoResultante: 'active', huboCruce: true });
  });

  it('ya activo, idempotente: no hace nada', async () => {
    const { cliente, consultas } = clienteFalso('active');
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'invited',
      estadoSiSinContraparte: 'invited',
    });
    expect(resultado).toEqual({ estadoResultante: 'active', huboCruce: false });
    expect(
      consultas.some((c) => c.texto.startsWith('INSERT') || c.texto.startsWith('UPDATE')),
    ).toBe(false);
  });

  it('ya en el mismo estado propuesto, idempotente: no hace nada', async () => {
    const { cliente, consultas } = clienteFalso('invited');
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'invited',
      estadoSiSinContraparte: 'invited',
    });
    expect(resultado).toEqual({ estadoResultante: 'invited', huboCruce: false });
    expect(
      consultas.some((c) => c.texto.startsWith('INSERT') || c.texto.startsWith('UPDATE')),
    ).toBe(false);
  });

  it('un vínculo declined se reactiva a la misma fila, sin crear una segunda', async () => {
    const { cliente, consultas } = clienteFalso('declined');
    const resultado = await upsertVinculo(cliente, {
      equipoId: 'e1',
      perfilId: 'p1',
      rol: 'player',
      estadoPropuesto: 'requested',
      estadoSiSinContraparte: 'requested',
    });
    expect(resultado).toEqual({ estadoResultante: 'requested', huboCruce: false });
    expect(consultas.some((c) => c.texto.startsWith('UPDATE'))).toBe(true);
    expect(consultas.some((c) => c.texto.startsWith('INSERT'))).toBe(false);
  });
});

describe('seguirEquipoAutomaticamente', () => {
  it('inserta el seguimiento con origen automático', async () => {
    const consultas: { texto: string; valores: unknown[] }[] = [];
    const cliente = {
      query: vi.fn(async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto, valores });
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await seguirEquipoAutomaticamente(cliente, 'usuario-1', '11111111-1111-1111-1111-111111111111');

    expect(consultas[0]!.texto).toContain('automatico');
    expect(consultas[0]!.valores).toEqual(['usuario-1', '11111111-1111-1111-1111-111111111111']);
  });
});
