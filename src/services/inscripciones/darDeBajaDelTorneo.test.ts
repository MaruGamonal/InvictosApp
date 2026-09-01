import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const EQUIPO_QUE_SE_VA = '33333333-3333-3333-3333-333333333333';
const RIVAL_A = '44444444-4444-4444-4444-444444444444';
const RIVAL_B = '55555555-5555-5555-5555-555555555555';
const GRUPO = '66666666-6666-6666-6666-666666666666';
const PERFIL_CAPITAN = '77777777-7777-7777-7777-777777777777';
const EQUIPO_PROMOVIDO = '88888888-8888-8888-8888-888888888888';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  esCapitan?: boolean;
  rolEnOrganizacion?: 'owner' | 'admin';
  estadoInscripcion?: string;
  estadoTorneo?: string;
  partidosPendientesPorAbandono?: 'ganados_por_rival' | 'anulados';
  golesWalkoverGanador?: number;
  golesWalkoverPerdedor?: number;
  partidosPendientes?: {
    id: string;
    grupo_id: string | null;
    equipo_local_id: string;
    equipo_visitante_id: string;
  }[];
  hayListaDeEspera?: boolean;
}) {
  const consultasCliente: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        if (t.startsWith('SELECT estado FROM inscripcion')) {
          return { rows: [{ estado: opciones.estadoInscripcion ?? 'approved' }] };
        }
        if (t.startsWith('SELECT id FROM perfil_deportivo')) {
          return { rows: opciones.esCapitan ? [{ id: PERFIL_CAPITAN }] : [] };
        }
        if (t.includes('rol_equipo FROM integrante_equipo')) {
          return { rows: opciones.esCapitan ? [{ rol_equipo: 'captain' }] : [] };
        }
        if (t.includes('organizacion_id FROM torneo')) return { rows: [{ organizacion_id: ORG }] };
        if (t.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (t.includes('FROM colaborador_torneo')) return { rows: [] };
        if (t.startsWith('SELECT estado, partidos_pendientes_por_abandono')) {
          return {
            rows: [
              {
                estado: opciones.estadoTorneo ?? 'registration_open',
                partidos_pendientes_por_abandono:
                  opciones.partidosPendientesPorAbandono ?? 'ganados_por_rival',
                goles_walkover_ganador: opciones.golesWalkoverGanador ?? 3,
                goles_walkover_perdedor: opciones.golesWalkoverPerdedor ?? 0,
                puntos_victoria: 3,
                puntos_empate: 1,
                puntos_derrota: 0,
              },
            ],
          };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string, valores: unknown[] = []) => {
          const t = texto.trim();
          consultasCliente.push({ texto: t, valores });
          if (t.startsWith('SELECT equipo_id FROM inscripcion')) {
            return { rows: opciones.hayListaDeEspera ? [{ equipo_id: EQUIPO_PROMOVIDO }] : [] };
          }
          if (t.startsWith('SELECT id, grupo_id, equipo_local_id')) {
            return { rows: opciones.partidosPendientes ?? [] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('darDeBajaDelTorneo', () => {
  it('el capitán se retira de un torneo que no empezó: withdrawn, libera cupo, sin lista de espera', async () => {
    const consultas = mockearDb({ esCapitan: true });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');

    const resultado = await darDeBajaDelTorneo(
      { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'withdrew' },
      contextoCon('usuario-capitan'),
    );

    expect(resultado).toEqual({
      estado: 'withdrawn',
      equipoPromovidoDeListaDeEspera: null,
      partidosAfectados: 0,
    });
    const update = consultas.find((c) => c.texto.startsWith('UPDATE inscripcion'));
    expect(update?.valores).toEqual([
      TORNEO,
      EQUIPO_QUE_SE_VA,
      'withdrawn',
      'withdrew',
      null,
      'usuario-capitan',
    ]);
  });

  it('con lista de espera y un cupo liberado, promueve al primero', async () => {
    mockearDb({ esCapitan: true, hayListaDeEspera: true });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');

    const resultado = await darDeBajaDelTorneo(
      { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'withdrew' },
      contextoCon('usuario-capitan'),
    );

    expect(resultado.equipoPromovidoDeListaDeEspera).toBe(EQUIPO_PROMOVIDO);
  });

  it('el organizador excluye un equipo con el torneo en curso: los pendientes quedan walkover a favor del rival', async () => {
    const consultas = mockearDb({
      rolEnOrganizacion: 'owner',
      estadoTorneo: 'in_progress',
      partidosPendientes: [
        {
          id: 'partido-1',
          grupo_id: GRUPO,
          equipo_local_id: EQUIPO_QUE_SE_VA,
          equipo_visitante_id: RIVAL_A,
        },
        {
          id: 'partido-2',
          grupo_id: GRUPO,
          equipo_local_id: RIVAL_B,
          equipo_visitante_id: EQUIPO_QUE_SE_VA,
        },
      ],
    });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');

    const resultado = await darDeBajaDelTorneo(
      { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'roster_incomplete' },
      contextoCon('usuario-organizador'),
    );

    expect(resultado).toEqual({
      estado: 'excluded',
      equipoPromovidoDeListaDeEspera: null,
      partidosAfectados: 2,
    });

    const updatesPartido = consultas.filter((c) => c.texto.startsWith('UPDATE partido'));
    expect(updatesPartido).toHaveLength(2);
    // partido-1: el equipo que se va era local -> gana el visitante (rival A)
    expect(updatesPartido[0]!.valores).toEqual([
      'partido-1',
      'walkover',
      expect.stringContaining('se dio de baja'),
      0,
      3,
      'confirmed',
      'usuario-organizador',
      expect.any(Date),
    ]);
    // partido-2: el equipo que se va era visitante -> gana el local (rival B)
    expect(updatesPartido[1]!.valores).toEqual([
      'partido-2',
      'walkover',
      expect.stringContaining('se dio de baja'),
      3,
      0,
      'confirmed',
      'usuario-organizador',
      expect.any(Date),
    ]);

    const insertsPosicion = consultas.filter((c) => c.texto.startsWith('INSERT INTO posicion'));
    // una sola fila de posicion por partido (la del rival): la del equipo que se va nunca se toca
    expect(insertsPosicion).toHaveLength(2);
    expect(insertsPosicion[0]!.valores).toEqual([GRUPO, RIVAL_A, 3, 1, 1, 0, 0, 3, 0, 3]);
    expect(insertsPosicion[1]!.valores).toEqual([GRUPO, RIVAL_B, 3, 1, 1, 0, 0, 3, 0, 3]);
  });

  it('torneo configurado en "anulados": los pendientes quedan cancelled y no tocan la posición', async () => {
    const consultas = mockearDb({
      rolEnOrganizacion: 'owner',
      estadoTorneo: 'in_progress',
      partidosPendientesPorAbandono: 'anulados',
      partidosPendientes: [
        {
          id: 'partido-1',
          grupo_id: GRUPO,
          equipo_local_id: EQUIPO_QUE_SE_VA,
          equipo_visitante_id: RIVAL_A,
        },
      ],
    });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');

    await darDeBajaDelTorneo(
      { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'no_show' },
      contextoCon('usuario-organizador'),
    );

    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update?.valores).toEqual([
      'partido-1',
      'cancelled',
      expect.stringContaining('se dio de baja'),
      null,
      null,
      'pending',
      null,
      null,
    ]);
    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO posicion'))).toBe(false);
  });

  it('con el torneo en curso, los partidos ya jugados no aparecen entre los pendientes a resolver', async () => {
    const consultas = mockearDb({
      rolEnOrganizacion: 'owner',
      estadoTorneo: 'in_progress',
      partidosPendientes: [],
    });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');

    const resultado = await darDeBajaDelTorneo(
      { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'disciplinary' },
      contextoCon('usuario-organizador'),
    );

    expect(resultado.partidosAfectados).toBe(0);
    expect(consultas.some((c) => c.texto.startsWith('UPDATE partido'))).toBe(false);
  });

  it('motivo "other" sin texto libre, DATOS_INVALIDOS', async () => {
    mockearDb({ esCapitan: true });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');
    await expect(
      darDeBajaDelTorneo(
        { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'other' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('motivo "other" con texto libre: se guarda junto al motivo', async () => {
    const consultas = mockearDb({ esCapitan: true });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');

    await darDeBajaDelTorneo(
      {
        torneoId: TORNEO,
        equipoId: EQUIPO_QUE_SE_VA,
        motivo: 'other',
        motivoDetalle: 'Se disolvió el plantel',
      },
      contextoCon('usuario-capitan'),
    );

    const update = consultas.find((c) => c.texto.startsWith('UPDATE inscripcion'));
    expect(update?.valores).toEqual([
      TORNEO,
      EQUIPO_QUE_SE_VA,
      'withdrawn',
      'other',
      'Se disolvió el plantel',
      'usuario-capitan',
    ]);
  });

  it('una inscripción ya withdrawn no admite una nueva baja', async () => {
    mockearDb({ esCapitan: true, estadoInscripcion: 'withdrawn' });
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');
    await expect(
      darDeBajaDelTorneo(
        { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'withdrew' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un colaborador no puede excluir a un equipo (solo Titular/Administrador)', async () => {
    mockearDb({});
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');
    await expect(
      darDeBajaDelTorneo(
        { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'no_show' },
        contextoCon('usuario-colaborador'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('inscripción inexistente, NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { darDeBajaDelTorneo } = await import('./darDeBajaDelTorneo');
    await expect(
      darDeBajaDelTorneo(
        { torneoId: TORNEO, equipoId: EQUIPO_QUE_SE_VA, motivo: 'withdrew' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
