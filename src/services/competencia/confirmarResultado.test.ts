import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const SISTEMA: Contexto = { usuarioId: null, permisos: {}, esSistema: true };
const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };
const USUARIO: Contexto = { usuarioId: 'usuario-1', permisos: {}, esSistema: false };

const PARTIDO = '11111111-1111-1111-1111-111111111111';
const TORNEO = '22222222-2222-2222-2222-222222222222';
const EQUIPO_LOCAL = '33333333-3333-3333-3333-333333333333';
const EQUIPO_VISITANTE = '44444444-4444-4444-4444-444444444444';

beforeEach(() => vi.resetModules());

function filaPartido(over: Partial<Record<string, unknown>> = {}) {
  return {
    torneo_id: TORNEO,
    equipo_local_id: EQUIPO_LOCAL,
    equipo_visitante_id: EQUIPO_VISITANTE,
    estado_resultado: 'loaded',
    ...over,
  };
}

function mockearDb(opciones: {
  partido?: ReturnType<typeof filaPartido> | null;
  disputaAbierta?: boolean;
}) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        consultas.push({ texto: t, valores });
        if (t.startsWith('SELECT torneo_id, equipo_local_id')) {
          const partido = opciones.partido === undefined ? filaPartido() : opciones.partido;
          return { rows: partido ? [partido] : [] };
        }
        if (t.startsWith('SELECT 1 FROM disputa_resultado')) {
          return { rows: opciones.disputaAbierta ? [{ '?column?': 1 }] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('confirmarResultado', () => {
  it('el contexto de sistema confirma un resultado en loaded', async () => {
    mockearDb({});
    const { confirmarResultado } = await import('./confirmarResultado');

    const resultado = await confirmarResultado({ partidoId: PARTIDO }, SISTEMA);

    expect(resultado).toEqual({ estadoResultado: 'confirmed', confirmadoPorVencimiento: true });
  });

  it('la actualización marca confirmado_por_vencimiento y fecha_confirmacion_resultado', async () => {
    const consultas = mockearDb({});
    const { confirmarResultado } = await import('./confirmarResultado');

    await confirmarResultado({ partidoId: PARTIDO }, SISTEMA);

    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update!.texto).toContain('confirmado_por_vencimiento');
    expect(update!.texto).toContain('fecha_confirmacion_resultado = now()');
    expect(update!.valores).toEqual([PARTIDO, true]);
  });

  it('un visitante sin sesión no puede confirmar: SIN_PERMISO', async () => {
    mockearDb({});
    const { confirmarResultado } = await import('./confirmarResultado');
    await expect(confirmarResultado({ partidoId: PARTIDO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'SIN_PERMISO',
    });
  });

  it('un usuario real todavía no puede confirmar a mano (eso es T29): SIN_PERMISO', async () => {
    mockearDb({});
    const { confirmarResultado } = await import('./confirmarResultado');
    await expect(confirmarResultado({ partidoId: PARTIDO }, USUARIO)).rejects.toMatchObject({
      codigo: 'SIN_PERMISO',
    });
  });

  it('partido inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ partido: null });
    const { confirmarResultado } = await import('./confirmarResultado');
    await expect(confirmarResultado({ partidoId: PARTIDO }, SISTEMA)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('un resultado que no está loaded no se puede confirmar', async () => {
    mockearDb({ partido: filaPartido({ estado_resultado: 'confirmed' }) });
    const { confirmarResultado } = await import('./confirmarResultado');
    await expect(confirmarResultado({ partidoId: PARTIDO }, SISTEMA)).rejects.toMatchObject({
      codigo: 'RESULTADO_NO_CONFIRMABLE',
    });
  });

  it('un resultado con una disputa abierta no se confirma: el plazo está congelado', async () => {
    mockearDb({ disputaAbierta: true });
    const { confirmarResultado } = await import('./confirmarResultado');
    await expect(confirmarResultado({ partidoId: PARTIDO }, SISTEMA)).rejects.toMatchObject({
      codigo: 'RESULTADO_NO_CONFIRMABLE',
    });
  });
});
