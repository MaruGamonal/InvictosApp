import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const EQUIPO_A = '33333333-3333-3333-3333-333333333333';
const EQUIPO_B = '44444444-4444-4444-4444-444444444444';

beforeEach(() => vi.resetModules());

function filaPartido(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'partido-1',
    numero_fecha: 1,
    fase_nombre: 'Fase única',
    grupo_nombre: 'Zona A',
    estado: 'scheduled',
    local_id: EQUIPO_A,
    local_nombre: 'Equipo A',
    local_escudo: null,
    visitante_id: EQUIPO_B,
    visitante_nombre: 'Equipo B',
    visitante_escudo: null,
    goles_local: null,
    goles_visitante: null,
    fecha_hora_programada: null,
    fecha_hora_original: null,
    sede_nombre: null,
    ...over,
  };
}

function mockearDb(opciones: {
  torneo?: { id: string; organizacion_id: string; estado: string } | null;
  partidos?: ReturnType<typeof filaPartido>[];
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT id, organizacion_id, estado FROM torneo')) {
          const torneo =
            opciones.torneo === undefined
              ? { id: TORNEO, organizacion_id: ORG, estado: 'in_progress' }
              : opciones.torneo;
          return { rows: torneo ? [torneo] : [] };
        }
        if (t.startsWith('SELECT p.id, p.numero_fecha')) {
          return { rows: opciones.partidos ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerFixturePublico', () => {
  it('devuelve los partidos con los datos de los dos equipos', async () => {
    mockearDb({ partidos: [filaPartido()] });
    const { obtenerFixturePublico } = await import('./obtenerFixturePublico');

    const fixture = await obtenerFixturePublico({ torneoId: TORNEO }, VISITANTE);

    expect(fixture.partidos).toHaveLength(1);
    expect(fixture.partidos[0]).toMatchObject({
      id: 'partido-1',
      numeroFecha: 1,
      equipoLocal: { id: EQUIPO_A, nombre: 'Equipo A', escudoUrl: null },
      equipoVisitante: { id: EQUIPO_B, nombre: 'Equipo B', escudoUrl: null },
    });
  });

  it('la fecha vigente es la primera que todavía no se resolvió', async () => {
    mockearDb({
      partidos: [
        filaPartido({ numero_fecha: 1, estado: 'played', goles_local: 1, goles_visitante: 0 }),
        filaPartido({ id: 'p2', numero_fecha: 2, estado: 'scheduled' }),
        filaPartido({ id: 'p3', numero_fecha: 3, estado: 'unscheduled' }),
      ],
    });
    const { obtenerFixturePublico } = await import('./obtenerFixturePublico');
    const fixture = await obtenerFixturePublico({ torneoId: TORNEO }, VISITANTE);
    expect(fixture.fechaVigente).toBe(2);
  });

  it('con todo resuelto, la fecha vigente es la última', async () => {
    mockearDb({
      partidos: [
        filaPartido({ numero_fecha: 1, estado: 'played', goles_local: 2, goles_visitante: 0 }),
        filaPartido({
          id: 'p2',
          numero_fecha: 2,
          estado: 'walkover',
          goles_local: 3,
          goles_visitante: 0,
        }),
      ],
    });
    const { obtenerFixturePublico } = await import('./obtenerFixturePublico');
    const fixture = await obtenerFixturePublico({ torneoId: TORNEO }, VISITANTE);
    expect(fixture.fechaVigente).toBe(2);
  });

  it('un torneo sin partidos todavía: fechaVigente null y lista vacía', async () => {
    mockearDb({ partidos: [] });
    const { obtenerFixturePublico } = await import('./obtenerFixturePublico');
    const fixture = await obtenerFixturePublico({ torneoId: TORNEO }, VISITANTE);
    expect(fixture).toEqual({ fechaVigente: null, partidos: [] });
  });

  it('un torneo draft no es visible para un visitante: NO_ENCONTRADO', async () => {
    mockearDb({ torneo: { id: TORNEO, organizacion_id: ORG, estado: 'draft' } });
    const { obtenerFixturePublico } = await import('./obtenerFixturePublico');
    await expect(obtenerFixturePublico({ torneoId: TORNEO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ torneo: null });
    const { obtenerFixturePublico } = await import('./obtenerFixturePublico');
    await expect(obtenerFixturePublico({ torneoId: TORNEO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
