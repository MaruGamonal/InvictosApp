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
const GRUPO = '66666666-6666-6666-6666-666666666666';
const PERFIL_CAPITAN_A = '77777777-7777-7777-7777-777777777777';

const notificarMock = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  notificarMock.mockClear();
  vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: notificarMock }));
});

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  esColaborador?: boolean;
  esCapitanDe?: string | null;
  estadoPartido?: string;
  golesLocalPrevios?: number | null;
  golesVisitantePrevios?: number | null;
  version?: number;
  grupoId?: string | null;
  torneoEstado?: string;
  puntosVictoria?: number;
  puntosEmpate?: number;
  puntosDerrota?: number;
}) {
  const consultasCliente: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
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
                version: opciones.version ?? 1,
                torneo_estado: opciones.torneoEstado ?? 'in_progress',
                puntos_victoria: opciones.puntosVictoria ?? 3,
                puntos_empate: opciones.puntosEmpate ?? 1,
                puntos_derrota: opciones.puntosDerrota ?? 0,
              },
            ],
          };
        }
        if (t.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (t.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (t.includes('FROM colaborador_torneo')) {
          return { rows: opciones.esColaborador ? [{}] : [] };
        }
        if (t.startsWith('SELECT id FROM perfil_deportivo')) {
          return { rows: opciones.esCapitanDe ? [{ id: PERFIL_CAPITAN_A }] : [] };
        }
        if (t.includes('rol_equipo FROM integrante_equipo')) {
          const equipoId = valores[1];
          const capitanea = opciones.esCapitanDe && equipoId === opciones.esCapitanDe;
          return { rows: capitanea ? [{ rol_equipo: 'captain' }] : [] };
        }
        if (t.includes('pd.usuario_id') && t.includes('ie.rol_equipo IN')) {
          return {
            rows: [{ usuario_id: 'usuario-capitan-a' }, { usuario_id: 'usuario-capitan-b' }],
          };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string, valores: unknown[] = []) => {
          const t = texto.trim();
          consultasCliente.push({ texto: t, valores });
          if (t.startsWith('UPDATE partido')) {
            return { rows: [{ version: (opciones.version ?? 1) + 1 }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('cargarResultado', () => {
  it('el organizador carga 2 a 1: en una sola operación queda played + confirmed', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { cargarResultado } = await import('./cargarResultado');

    const resultado = await cargarResultado(
      { partidoId: PARTIDO, version: 1, golesLocal: 2, golesVisitante: 1 },
      contextoCon('usuario-organizador'),
    );

    expect(resultado).toEqual({
      estado: 'played',
      estadoResultado: 'confirmed',
      golesLocal: 2,
      golesVisitante: 1,
      version: 2,
    });
    expect(consultas[0]!.texto).toBe('BEGIN');
    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update?.texto).toContain("estado = 'played'");
    expect(update?.valores).toEqual([PARTIDO, 2, 1, 'confirmed', 'usuario-organizador']);
    expect(consultas.at(-1)!.texto).toBe('COMMIT');
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'result_published' }),
      expect.anything(),
    );
  });

  it('un colaborador asignado también carga como confirmed', async () => {
    mockearDb({ esColaborador: true });
    const { cargarResultado } = await import('./cargarResultado');
    const resultado = await cargarResultado(
      { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 0 },
      contextoCon('usuario-colaborador'),
    );
    expect(resultado.estadoResultado).toBe('confirmed');
  });

  it('el capitán de uno de los equipos carga: queda loaded, no confirmed', async () => {
    mockearDb({ esCapitanDe: EQUIPO_A });
    const { cargarResultado } = await import('./cargarResultado');

    const resultado = await cargarResultado(
      { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 1 },
      contextoCon('usuario-capitan'),
    );

    expect(resultado.estadoResultado).toBe('loaded');
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'result_pending_confirmation' }),
      expect.anything(),
    );
  });

  it('carga fresca 2-1: aplica el efecto completo a la posición de los dos equipos', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { cargarResultado } = await import('./cargarResultado');

    await cargarResultado(
      { partidoId: PARTIDO, version: 1, golesLocal: 2, golesVisitante: 1 },
      contextoCon('usuario-organizador'),
    );

    const inserts = consultas.filter((c) => c.texto.startsWith('INSERT INTO posicion'));
    expect(inserts).toHaveLength(2);
    const [local, visitante] = inserts;
    // grupoId, equipoId, puntos, partidosJugados, ganados, empatados, perdidos, golesFavor, golesContra, diferenciaGol
    expect(local!.valores).toEqual([GRUPO, EQUIPO_A, 3, 1, 1, 0, 0, 2, 1, 1]);
    expect(visitante!.valores).toEqual([GRUPO, EQUIPO_B, 0, 1, 0, 0, 1, 1, 2, -1]);
  });

  it('corrección 2-1 -> 2-2: revierte el efecto anterior y aplica el nuevo, no dos operaciones', async () => {
    const consultas = mockearDb({
      rolEnOrganizacion: 'owner',
      estadoPartido: 'played',
      golesLocalPrevios: 2,
      golesVisitantePrevios: 1,
      version: 3,
    });
    const { cargarResultado } = await import('./cargarResultado');

    await cargarResultado(
      { partidoId: PARTIDO, version: 3, golesLocal: 2, golesVisitante: 2 },
      contextoCon('usuario-organizador'),
    );

    const inserts = consultas.filter((c) => c.texto.startsWith('INSERT INTO posicion'));
    const [local, visitante] = inserts;
    // nuevo empate (1pt) - anterior victoria (3pt) = -2; partidos_jugados neto 0
    expect(local!.valores).toEqual([GRUPO, EQUIPO_A, -2, 0, -1, 1, 0, 0, 1, -1]);
    // nuevo empate (1pt) - anterior derrota (0pt) = +1; partidos_jugados neto 0
    expect(visitante!.valores).toEqual([GRUPO, EQUIPO_B, 1, 0, 0, 1, -1, 1, 0, 1]);
  });

  it('torneo configurado en 2/1/0: el ganador suma dos puntos, no tres', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner', puntosVictoria: 2 });
    const { cargarResultado } = await import('./cargarResultado');

    await cargarResultado(
      { partidoId: PARTIDO, version: 1, golesLocal: 3, golesVisitante: 0 },
      contextoCon('usuario-organizador'),
    );

    const local = consultas.find(
      (c) => c.texto.startsWith('INSERT INTO posicion') && c.valores[1] === EQUIPO_A,
    );
    expect(local!.valores[2]).toBe(2);
  });

  it('partido de eliminación directa (sin grupo): no toca posicion', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner', grupoId: null });
    const { cargarResultado } = await import('./cargarResultado');

    await cargarResultado(
      { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 0 },
      contextoCon('usuario-organizador'),
    );

    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO posicion'))).toBe(false);
  });

  it('version distinta a la vigente: CONFLICTO_DE_VERSION con el resultado actual', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      version: 5,
      estadoPartido: 'played',
      golesLocalPrevios: 2,
      golesVisitantePrevios: 1,
    });
    const { cargarResultado } = await import('./cargarResultado');

    const error = await cargarResultado(
      { partidoId: PARTIDO, version: 4, golesLocal: 1, golesVisitante: 1 },
      contextoCon('usuario-organizador'),
    ).catch((e) => e);

    expect(error.codigo).toBe('CONFLICTO_DE_VERSION');
    expect(error.detalle).toMatchObject({ version: 5, golesLocal: 2, golesVisitante: 1 });
  });

  it('torneo que no está in_progress: TORNEO_NO_EN_CURSO', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', torneoEstado: 'registration_closed' });
    const { cargarResultado } = await import('./cargarResultado');
    await expect(
      cargarResultado(
        { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 0 },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'TORNEO_NO_EN_CURSO' });
  });

  it('partido cancelado: DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoPartido: 'cancelled' });
    const { cargarResultado } = await import('./cargarResultado');
    await expect(
      cargarResultado(
        { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 0 },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('quien no es capitán de ninguno de los dos equipos ni organizador: SIN_PERMISO', async () => {
    mockearDb({});
    const { cargarResultado } = await import('./cargarResultado');
    await expect(
      cargarResultado(
        { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 0 },
        contextoCon('usuario-cualquiera'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('una falla en medio de la transacción no deja nada modificado (rollback)', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async (texto: string) => {
          if (texto.trim().startsWith('SELECT p.torneo_id')) {
            return {
              rows: [
                {
                  torneo_id: TORNEO,
                  grupo_id: GRUPO,
                  equipo_local_id: EQUIPO_A,
                  equipo_visitante_id: EQUIPO_B,
                  estado: 'scheduled',
                  goles_local: null,
                  goles_visitante: null,
                  version: 1,
                  torneo_estado: 'in_progress',
                  puntos_victoria: 3,
                  puntos_empate: 1,
                  puntos_derrota: 0,
                },
              ],
            };
          }
          if (texto.includes('organizacion_id FROM torneo'))
            return { rows: [{ organizacion_id: ORG }] };
          if (texto.includes('FROM miembro_organizacion')) return { rows: [{ rol: 'owner' }] };
          return { rows: [] };
        },
        connect: async () => {
          const consultas: string[] = [];
          return {
            query: async (texto: string) => {
              const t = texto.trim();
              consultas.push(t);
              if (t.startsWith('UPDATE partido')) {
                throw new Error('falla simulada de conexión');
              }
              return { rows: [] };
            },
            release: () => {},
          };
        },
      }),
    }));
    const { cargarResultado } = await import('./cargarResultado');
    await expect(
      cargarResultado(
        { partidoId: PARTIDO, version: 1, golesLocal: 2, golesVisitante: 1 },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toThrow('falla simulada de conexión');
  });

  it('partido inexistente, NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { cargarResultado } = await import('./cargarResultado');
    await expect(
      cargarResultado(
        { partidoId: PARTIDO, version: 1, golesLocal: 1, golesVisitante: 0 },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
