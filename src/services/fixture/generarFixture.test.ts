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

beforeEach(() => vi.resetModules());

function equipos(n: number) {
  return Array.from({ length: n }, (_, i) => `equipo-${i + 1}`);
}

function mockearDb(opciones: {
  fase?: {
    tipo_fase: 'league' | 'knockout';
    orden?: number;
    ida_y_vuelta?: boolean;
    clasifican_por_grupo?: number | null;
  };
  estadoTorneo?: string;
  rolEnOrganizacion?: 'owner' | 'admin';
  grupos?: Array<{ id: string; nombre: string }>;
  aprobados?: string[];
  partidosJugados?: number;
  partidosExistentes?: Array<{
    numero_fecha: number;
    equipo_local_id: string;
    equipo_visitante_id: string;
    goles_local: number | null;
    goles_visitante: number | null;
    estado: string;
  }>;
  faseAnterior?: { id: string };
  faseAnteriorSinTerminar?: boolean;
  clasificadosPorGrupo?: Record<string, string[]>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        if (texto.startsWith('SELECT id, torneo_id, tipo_fase')) {
          return {
            rows: [
              {
                id: FASE,
                torneo_id: TORNEO,
                tipo_fase: opciones.fase?.tipo_fase ?? 'league',
                orden: opciones.fase?.orden ?? 1,
                ida_y_vuelta: opciones.fase?.ida_y_vuelta ?? false,
                clasifican_por_grupo: opciones.fase?.clasifican_por_grupo ?? null,
              },
            ],
          };
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
        if (texto === 'SELECT estado FROM torneo WHERE id = $1') {
          return { rows: [{ estado: opciones.estadoTorneo ?? 'registration_closed' }] };
        }
        if (texto.includes("estado = 'played'")) {
          return { rows: [{ count: String(opciones.partidosJugados ?? 0) }] };
        }
        if (texto.startsWith('SELECT id, nombre FROM grupo')) {
          return { rows: opciones.grupos ?? [{ id: 'grupo-1', nombre: 'Grupo único' }] };
        }
        if (texto.includes("estado = 'approved'")) {
          return { rows: (opciones.aprobados ?? equipos(8)).map((equipo_id) => ({ equipo_id })) };
        }
        if (texto.startsWith('SELECT numero_fecha, equipo_local_id')) {
          return { rows: opciones.partidosExistentes ?? [] };
        }
        if (texto.startsWith('SELECT id FROM fase WHERE torneo_id')) {
          return { rows: opciones.faseAnterior ? [opciones.faseAnterior] : [] };
        }
        if (texto.includes("NOT IN ('played', 'walkover', 'cancelled')")) {
          return { rows: opciones.faseAnteriorSinTerminar ? [{}] : [] };
        }
        if (texto.startsWith('SELECT id FROM grupo WHERE fase_id')) {
          return { rows: opciones.grupos ?? [] };
        }
        if (texto.startsWith('SELECT equipo_id FROM posicion')) {
          const grupoId = valores[0] as string;
          return {
            rows: (opciones.clasificadosPorGrupo?.[grupoId] ?? []).map((equipo_id) => ({
              equipo_id,
            })),
          };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('generarFixture — liga', () => {
  it('con 8 equipos, propone 7 fechas de 4 partidos, sin persistir nada', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', aprobados: equipos(8) });
    const { generarFixture } = await import('./generarFixture');

    const resultado = await generarFixture({ faseId: FASE }, contextoCon('usuario-1'));

    expect(resultado.partidos).toHaveLength(28); // C(8,2)
    expect(resultado.asignacionesGrupo).toHaveLength(8);
    expect(resultado.partidos.every((p) => p.grupoId === 'grupo-1')).toBe(true);
  });

  it('con inscripciones abiertas, INSCRIPCIONES_ABIERTAS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'registration_open' });
    const { generarFixture } = await import('./generarFixture');
    await expect(generarFixture({ faseId: FASE }, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'INSCRIPCIONES_ABIERTAS',
    });
  });

  it('distribuye los equipos en las zonas de grupos + eliminatoria', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      grupos: [
        { id: 'zona-a', nombre: 'Zona A' },
        { id: 'zona-b', nombre: 'Zona B' },
      ],
      aprobados: equipos(6),
    });
    const { generarFixture } = await import('./generarFixture');

    const resultado = await generarFixture({ faseId: FASE }, contextoCon('usuario-1'));

    const zonaA = resultado.asignacionesGrupo.filter((a) => a.grupoId === 'zona-a');
    const zonaB = resultado.asignacionesGrupo.filter((a) => a.grupoId === 'zona-b');
    expect(zonaA).toHaveLength(3);
    expect(zonaB).toHaveLength(3);
    // liga interna: cada zona de 3 equipos genera 3 partidos
    expect(resultado.partidos.filter((p) => p.grupoId === 'zona-a')).toHaveLength(3);
  });

  it('un colaborador no puede generar el fixture', async () => {
    mockearDb({});
    const { generarFixture } = await import('./generarFixture');
    await expect(generarFixture({ faseId: FASE }, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'SIN_PERMISO',
    });
  });
});

describe('generarFixture — eliminación directa', () => {
  it('con 8 equipos aprobados arma la primera ronda', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      fase: { tipo_fase: 'knockout' },
      aprobados: equipos(8),
    });
    const { generarFixture } = await import('./generarFixture');

    const resultado = await generarFixture({ faseId: FASE }, contextoCon('usuario-1'));

    expect(resultado.partidos).toHaveLength(4);
    expect(resultado.partidos.every((p) => p.numeroFecha === 1)).toBe(true);
  });

  it('genera la ronda siguiente con los ganadores de la anterior', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      fase: { tipo_fase: 'knockout' },
      partidosExistentes: [
        {
          numero_fecha: 1,
          equipo_local_id: 'A',
          equipo_visitante_id: 'B',
          goles_local: 2,
          goles_visitante: 1,
          estado: 'played',
        },
        {
          numero_fecha: 1,
          equipo_local_id: 'C',
          equipo_visitante_id: 'D',
          goles_local: 0,
          goles_visitante: 3,
          estado: 'played',
        },
      ],
    });
    const { generarFixture } = await import('./generarFixture');

    const resultado = await generarFixture({ faseId: FASE }, contextoCon('usuario-1'));

    expect(resultado.partidos).toEqual([
      { numeroFecha: 2, equipoLocalId: 'A', equipoVisitanteId: 'D', grupoId: null },
    ]);
  });

  it('si hay partidos de la ronda anterior sin definir, DATOS_INVALIDOS', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      fase: { tipo_fase: 'knockout' },
      partidosExistentes: [
        {
          numero_fecha: 1,
          equipo_local_id: 'A',
          equipo_visitante_id: 'B',
          goles_local: null,
          goles_visitante: null,
          estado: 'unscheduled',
        },
        {
          numero_fecha: 1,
          equipo_local_id: 'C',
          equipo_visitante_id: 'D',
          goles_local: 0,
          goles_visitante: 3,
          estado: 'played',
        },
      ],
    });
    const { generarFixture } = await import('./generarFixture');
    await expect(generarFixture({ faseId: FASE }, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
  });

  it('la segunda fase de grupos + eliminatoria arma las llaves con los clasificados', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      fase: { tipo_fase: 'knockout', orden: 2, clasifican_por_grupo: 1 },
      faseAnterior: { id: 'fase-1' },
      grupos: [
        { id: 'zona-a', nombre: 'Zona A' },
        { id: 'zona-b', nombre: 'Zona B' },
      ],
      clasificadosPorGrupo: { 'zona-a': ['campeon-a'], 'zona-b': ['campeon-b'] },
    });
    const { generarFixture } = await import('./generarFixture');

    const resultado = await generarFixture({ faseId: FASE }, contextoCon('usuario-1'));

    expect(resultado.partidos).toEqual([
      { numeroFecha: 1, equipoLocalId: 'campeon-a', equipoVisitanteId: 'campeon-b', grupoId: null },
    ]);
  });

  it('no genera la fase eliminatoria si la fase de grupos no terminó', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      fase: { tipo_fase: 'knockout', orden: 2 },
      faseAnterior: { id: 'fase-1' },
      faseAnteriorSinTerminar: true,
    });
    const { generarFixture } = await import('./generarFixture');
    await expect(generarFixture({ faseId: FASE }, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
  });
});
