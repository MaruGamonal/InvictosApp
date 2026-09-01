import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const PARTIDO = '11111111-1111-1111-1111-111111111111';
const TORNEO = '22222222-2222-2222-2222-222222222222';
const ORG = '33333333-3333-3333-3333-333333333333';
const EQUIPO_A = '44444444-4444-4444-4444-444444444444';
const EQUIPO_B = '55555555-5555-5555-5555-555555555555';
const OTRO_EQUIPO = '99999999-9999-9999-9999-999999999999';
const GRUPO = '66666666-6666-6666-6666-666666666666';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  esColaborador?: boolean;
  estadoPartido?: string;
  golesLocalPrevios?: number | null;
  golesVisitantePrevios?: number | null;
  grupoId?: string | null;
  golesWalkoverGanador?: number;
  golesWalkoverPerdedor?: number;
}) {
  const consultasCliente: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT p.torneo_id')) {
          return {
            rows: [
              {
                torneo_id: TORNEO,
                grupo_id: opciones.grupoId === undefined ? GRUPO : opciones.grupoId,
                equipo_local_id: EQUIPO_A,
                equipo_visitante_id: EQUIPO_B,
                estado: opciones.estadoPartido ?? 'scheduled',
                goles_local: opciones.golesLocalPrevios ?? null,
                goles_visitante: opciones.golesVisitantePrevios ?? null,
                goles_walkover_ganador: opciones.golesWalkoverGanador ?? 3,
                goles_walkover_perdedor: opciones.golesWalkoverPerdedor ?? 0,
                puntos_victoria: 3,
                puntos_empate: 1,
                puntos_derrota: 0,
              },
            ],
          };
        }
        if (t.includes('organizacion_id FROM torneo')) return { rows: [{ organizacion_id: ORG }] };
        if (t.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (t.includes('FROM colaborador_torneo'))
          return { rows: opciones.esColaborador ? [{}] : [] };
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string, valores: unknown[] = []) => {
          const t = texto.trim();
          consultasCliente.push({ texto: t, valores });
          if (t.startsWith('UPDATE partido')) return { rows: [{ version: 2 }] };
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('registrarNoDisputado', () => {
  it('walkover al local: queda en walkover con el resultado configurado del torneo', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    const resultado = await registrarNoDisputado(
      {
        partidoId: PARTIDO,
        resolucion: 'walkover',
        equipoGanadorId: EQUIPO_A,
        motivo: 'No se presentó el rival',
      },
      contextoCon('usuario-organizador'),
    );

    expect(resultado).toEqual({ estado: 'walkover', golesLocal: 3, golesVisitante: 0, version: 2 });
    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update?.valores).toEqual([
      PARTIDO,
      'walkover',
      'No se presentó el rival',
      3,
      0,
      'confirmed',
      'usuario-organizador',
      expect.any(Date),
    ]);
  });

  it('walkover con resultado configurado en 2-0: la diferencia de gol se mueve en dos', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', golesWalkoverGanador: 2, golesWalkoverPerdedor: 0 });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    const resultado = await registrarNoDisputado(
      { partidoId: PARTIDO, resolucion: 'walkover', equipoGanadorId: EQUIPO_B },
      contextoCon('usuario-organizador'),
    );

    expect(resultado.golesLocal).toBe(0);
    expect(resultado.golesVisitante).toBe(2);
  });

  it('walkover: aplica el efecto a la posición de los dos equipos, en la misma operación', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    await registrarNoDisputado(
      { partidoId: PARTIDO, resolucion: 'walkover', equipoGanadorId: EQUIPO_A },
      contextoCon('usuario-organizador'),
    );

    const inserts = consultas.filter((c) => c.texto.startsWith('INSERT INTO posicion'));
    expect(inserts).toHaveLength(2);
    expect(inserts[0]!.valores).toEqual([GRUPO, EQUIPO_A, 3, 1, 1, 0, 0, 3, 0, 3]);
    expect(inserts[1]!.valores).toEqual([GRUPO, EQUIPO_B, 0, 1, 0, 0, 1, 0, 3, -3]);
  });

  it('anular un walkover ya cargado: revierte su efecto sobre la posición sin aplicar uno nuevo', async () => {
    const consultas = mockearDb({
      rolEnOrganizacion: 'owner',
      estadoPartido: 'walkover',
      golesLocalPrevios: 3,
      golesVisitantePrevios: 0,
    });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    const resultado = await registrarNoDisputado(
      { partidoId: PARTIDO, resolucion: 'cancelled', motivo: 'Acuerdo entre los dos equipos' },
      contextoCon('usuario-organizador'),
    );

    expect(resultado).toEqual({
      estado: 'cancelled',
      golesLocal: null,
      golesVisitante: null,
      version: 2,
    });
    const inserts = consultas.filter((c) => c.texto.startsWith('INSERT INTO posicion'));
    expect(inserts).toHaveLength(2);
    // revierte exactamente lo que el walkover 3-0 había aplicado
    expect(inserts[0]!.valores).toEqual([GRUPO, EQUIPO_A, -3, -1, -1, 0, 0, -3, 0, -3]);
    expect(inserts[1]!.valores).toEqual([GRUPO, EQUIPO_B, 0, -1, 0, 0, -1, 0, -3, 3]);
  });

  it('posponer un partido que nunca tuvo resultado no toca la posición', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    await registrarNoDisputado(
      { partidoId: PARTIDO, resolucion: 'postponed', motivo: 'Lluvia' },
      contextoCon('usuario-organizador'),
    );

    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO posicion'))).toBe(false);
  });

  it('cancelar directamente (sin walkover previo) no toca la posición', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    await registrarNoDisputado(
      { partidoId: PARTIDO, resolucion: 'cancelled', motivo: 'Torneo suspendido en esa fecha' },
      contextoCon('usuario-organizador'),
    );

    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO posicion'))).toBe(false);
  });

  it('un colaborador asignado también puede registrar un partido no disputado', async () => {
    mockearDb({ esColaborador: true });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');
    await expect(
      registrarNoDisputado(
        { partidoId: PARTIDO, resolucion: 'postponed' },
        contextoCon('usuario-colaborador'),
      ),
    ).resolves.toMatchObject({ estado: 'postponed' });
  });

  it('un partido ya jugado no se puede registrar como no disputado', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoPartido: 'played' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');
    await expect(
      registrarNoDisputado(
        { partidoId: PARTIDO, resolucion: 'cancelled' },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('walkover sin equipoGanadorId, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');
    await expect(
      registrarNoDisputado(
        { partidoId: PARTIDO, resolucion: 'walkover' },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('walkover con un equipo que no juega ese partido, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');
    await expect(
      registrarNoDisputado(
        { partidoId: PARTIDO, resolucion: 'walkover', equipoGanadorId: OTRO_EQUIPO },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('quien no está asignado al torneo no puede registrar', async () => {
    mockearDb({});
    const { registrarNoDisputado } = await import('./registrarNoDisputado');
    await expect(
      registrarNoDisputado(
        { partidoId: PARTIDO, resolucion: 'postponed' },
        contextoCon('usuario-cualquiera'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('partido de eliminación directa (sin grupo): no toca posicion', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner', grupoId: null });
    const { registrarNoDisputado } = await import('./registrarNoDisputado');

    await registrarNoDisputado(
      { partidoId: PARTIDO, resolucion: 'walkover', equipoGanadorId: EQUIPO_A },
      contextoCon('usuario-organizador'),
    );

    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO posicion'))).toBe(false);
  });

  it('partido inexistente, NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { registrarNoDisputado } = await import('./registrarNoDisputado');
    await expect(
      registrarNoDisputado(
        { partidoId: PARTIDO, resolucion: 'postponed' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
