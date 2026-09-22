import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const FASE = '11111111-1111-1111-1111-111111111111';
const TORNEO = '22222222-2222-2222-2222-222222222222';
const ORG = '33333333-3333-3333-3333-333333333333';
const EQUIPO_A = '44444444-4444-4444-4444-444444444444';
const EQUIPO_B = '55555555-5555-5555-5555-555555555555';
const GRUPO = '66666666-6666-6666-6666-666666666666';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  partidosJugados?: number;
  /** Equipos que la base reconoce como inscriptos y aprobados en el torneo. */
  inscriptos?: string[];
  /** Zonas que la base reconoce como pertenecientes a esta fase. */
  gruposDeLaFase?: string[];
}) {
  const consultasCliente: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.startsWith('SELECT torneo_id FROM fase')) {
          return { rows: [{ torneo_id: TORNEO }] };
        }
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.includes("estado = 'played'")) {
          return { rows: [{ count: String(opciones.partidosJugados ?? 0) }] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string, valores: unknown[] = []) => {
          consultasCliente.push({ texto: texto.trim(), valores });
          // La propuesta se valida contra la base antes de escribir:
          // equipos aprobados en el torneo y zonas de esta fase.
          if (texto.includes('equipo_id FROM inscripcion')) {
            const pedidos = (valores[1] ?? []) as string[];
            const aprobados = opciones.inscriptos ?? [EQUIPO_A, EQUIPO_B];
            return {
              rows: pedidos
                .filter((id) => aprobados.includes(id))
                .map((equipo_id) => ({ equipo_id })),
            };
          }
          if (texto.includes('FROM grupo WHERE id = ANY')) {
            const pedidos = (valores[0] ?? []) as string[];
            const propias = opciones.gruposDeLaFase ?? [GRUPO];
            return { rows: pedidos.filter((id) => propias.includes(id)).map((id) => ({ id })) };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

const UN_PARTIDO = [
  { numeroFecha: 1, equipoLocalId: EQUIPO_A, equipoVisitanteId: EQUIPO_B, grupoId: GRUPO },
];

describe('confirmarFixture', () => {
  it('crea los partidos y asigna el grupo a cada inscripción', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { confirmarFixture } = await import('./confirmarFixture');

    const resultado = await confirmarFixture(
      {
        faseId: FASE,
        partidos: UN_PARTIDO,
        asignacionesGrupo: [
          { equipoId: EQUIPO_A, grupoId: GRUPO },
          { equipoId: EQUIPO_B, grupoId: GRUPO },
        ],
      },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ partidosCreados: 1 });
    expect(consultas[0]!.texto).toBe('BEGIN');
    expect(consultas.some((c) => c.texto.startsWith('DELETE FROM partido'))).toBe(true);
    expect(consultas.some((c) => c.texto.startsWith('UPDATE inscripcion'))).toBe(true);
    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO partido'))).toBe(true);
    expect(consultas.at(-1)!.texto).toBe('COMMIT');
  });

  it('borra eventos y disputas de los partidos anteriores antes de recrearlos', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { confirmarFixture } = await import('./confirmarFixture');

    await confirmarFixture({ faseId: FASE, partidos: UN_PARTIDO }, contextoCon('usuario-1'));

    expect(consultas.some((c) => c.texto.startsWith('DELETE FROM evento_partido'))).toBe(true);
    expect(consultas.some((c) => c.texto.startsWith('DELETE FROM disputa_resultado'))).toBe(true);
  });

  it('con partidos jugados y sin confirmar la pérdida, FIXTURE_CON_PARTIDOS_JUGADOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', partidosJugados: 3 });
    const { confirmarFixture } = await import('./confirmarFixture');

    const error = await confirmarFixture(
      { faseId: FASE, partidos: UN_PARTIDO },
      contextoCon('usuario-1'),
    ).catch((e) => e);
    expect(error.codigo).toBe('FIXTURE_CON_PARTIDOS_JUGADOS');
    expect(error.detalle).toEqual({ cantidadPartidosJugados: 3 });
  });

  it('con partidos jugados y confirmando la pérdida, procede igual', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', partidosJugados: 3 });
    const { confirmarFixture } = await import('./confirmarFixture');

    await expect(
      confirmarFixture(
        { faseId: FASE, partidos: UN_PARTIDO, confirmoPerdidaDeResultados: true },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ partidosCreados: 1 });
  });

  it('un colaborador no puede confirmar el fixture', async () => {
    mockearDb({});
    const { confirmarFixture } = await import('./confirmarFixture');
    await expect(
      confirmarFixture({ faseId: FASE, partidos: UN_PARTIDO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('fase inexistente, NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { confirmarFixture } = await import('./confirmarFixture');
    await expect(
      confirmarFixture({ faseId: FASE, partidos: UN_PARTIDO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});

/**
 * La propuesta llega del cliente: sin validarla, quien configura su
 * torneo podía crear partidos con cualquier equipo de la plataforma, de
 * un equipo contra sí mismo, o apuntando a la zona de otro torneo.
 */
describe('confirmarFixture valida la propuesta antes de escribir', () => {
  const EQUIPO_AJENO = '77777777-7777-7777-7777-777777777777';
  const GRUPO_AJENO = '88888888-8888-8888-8888-888888888888';

  it('rechaza un equipo que no está inscripto', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { confirmarFixture } = await import('./confirmarFixture');

    await expect(
      confirmarFixture(
        {
          faseId: FASE,
          partidos: [
            {
              numeroFecha: 1,
              equipoLocalId: EQUIPO_A,
              equipoVisitanteId: EQUIPO_AJENO,
              grupoId: GRUPO,
            },
          ],
        },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });

    // Y no destruyó el fixture anterior.
    expect(consultas.some((c) => c.texto.startsWith('DELETE FROM partido'))).toBe(false);
    expect(consultas.some((c) => c.texto.startsWith('ROLLBACK'))).toBe(true);
  });

  it('rechaza un equipo contra sí mismo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { confirmarFixture } = await import('./confirmarFixture');

    await expect(
      confirmarFixture(
        {
          faseId: FASE,
          partidos: [
            {
              numeroFecha: 1,
              equipoLocalId: EQUIPO_A,
              equipoVisitanteId: EQUIPO_A,
              grupoId: GRUPO,
            },
          ],
        },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza una zona de otra fase', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { confirmarFixture } = await import('./confirmarFixture');

    await expect(
      confirmarFixture(
        {
          faseId: FASE,
          partidos: [
            {
              numeroFecha: 1,
              equipoLocalId: EQUIPO_A,
              equipoVisitanteId: EQUIPO_B,
              grupoId: GRUPO_AJENO,
            },
          ],
        },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('también valida los equipos de las asignaciones de zona', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { confirmarFixture } = await import('./confirmarFixture');

    await expect(
      confirmarFixture(
        {
          faseId: FASE,
          partidos: UN_PARTIDO,
          asignacionesGrupo: [{ equipoId: EQUIPO_AJENO, grupoId: GRUPO }],
        },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
