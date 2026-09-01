import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const VISITANTE = contextoCon(null);

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const CIUDAD = '33333333-3333-3333-3333-333333333333';
const FASE = '44444444-4444-4444-4444-444444444444';
const EQUIPO_A = '66666666-6666-6666-6666-666666666666';
const EQUIPO_B = '77777777-7777-7777-7777-777777777777';

beforeEach(() => vi.resetModules());

function filaTorneoBase(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: TORNEO,
    nombre: 'Copa Amistad',
    descripcion: 'Torneo de verano',
    modalidad: 'f5',
    categoria_genero: 'male',
    categoria_edad: 'open',
    ciudad_id: CIUDAD,
    ciudad_nombre: 'Rosario',
    estado: 'registration_open',
    visibilidad: 'public',
    formato: 'league',
    cupo_equipos: 8,
    fecha_inicio_estimada: null,
    fecha_fin_estimada: null,
    organizacion_id: ORG,
    organizacion_nombre: 'Liga Sur',
    organizacion_logo_url: 'https://cdn.example.com/liga-sur.png',
    organizacion_nivel_verificacion: 'basic',
    ...over,
  };
}

function mockearDb(opciones: {
  torneo?: ReturnType<typeof filaTorneoBase> | null;
  aprobados?: number;
  hayReglamento?: boolean;
  proximoPartido?: Record<string, unknown> | null;
  rolEnOrganizacion?: 'owner' | 'admin';
  esColaborador?: boolean;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT t.id, t.nombre')) {
          const torneo = opciones.torneo === undefined ? filaTorneoBase() : opciones.torneo;
          return { rows: torneo ? [torneo] : [] };
        }
        if (t.includes('organizacion_id FROM torneo')) return { rows: [{ organizacion_id: ORG }] };
        if (t.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (t.includes('FROM colaborador_torneo'))
          return { rows: opciones.esColaborador ? [{}] : [] };
        if (t.startsWith('SELECT count(*) FROM inscripcion')) {
          return { rows: [{ count: String(opciones.aprobados ?? 0) }] };
        }
        if (t.startsWith('SELECT 1 FROM reglamento')) {
          return { rows: opciones.hayReglamento ? [{}] : [] };
        }
        if (t.startsWith('SELECT p.id, p.fecha_hora_programada')) {
          return { rows: opciones.proximoPartido ? [opciones.proximoPartido] : [] };
        }
        if (t.startsWith('SELECT id, tipo_fase FROM fase')) return { rows: [] };
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerFichaTorneo', () => {
  it('un visitante sin cuenta ve la ficha completa de un torneo publicado', async () => {
    mockearDb({ aprobados: 3, hayReglamento: true });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');

    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);

    expect(ficha.nombre).toBe('Copa Amistad');
    expect(ficha.ciudad).toEqual({ id: CIUDAD, nombre: 'Rosario' });
    expect(ficha.equiposAprobados).toBe(3);
    expect(ficha.tieneReglamento).toBe(true);
    expect(ficha.imagenUrl).toBe('https://cdn.example.com/liga-sur.png');
    expect(ficha.organizacion).toEqual({ id: ORG, nombre: 'Liga Sur', nivelVerificacion: 'basic' });
  });

  it('un torneo sin reglamento no marca tieneReglamento', async () => {
    mockearDb({ hayReglamento: false });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(ficha.tieneReglamento).toBe(false);
  });

  it('en curso, incluye la próxima fecha programada', async () => {
    mockearDb({
      torneo: filaTorneoBase({ estado: 'in_progress' }),
      proximoPartido: {
        id: 'partido-1',
        fecha_hora_programada: new Date('2026-05-01T18:00:00.000Z'),
        local_id: EQUIPO_A,
        local_nombre: 'Equipo A',
        local_escudo: null,
        visitante_id: EQUIPO_B,
        visitante_nombre: 'Equipo B',
        visitante_escudo: null,
      },
    });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(ficha.proximoPartido).toEqual({
      id: 'partido-1',
      equipoLocal: { id: EQUIPO_A, nombre: 'Equipo A', escudoUrl: null },
      equipoVisitante: { id: EQUIPO_B, nombre: 'Equipo B', escudoUrl: null },
      fechaHoraProgramada: '2026-05-01T18:00:00.000Z',
    });
    expect(ficha.campeon).toBeNull();
  });

  it('un torneo registration_open no calcula próximo partido ni campeón', async () => {
    mockearDb({});
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(ficha.proximoPartido).toBeNull();
    expect(ficha.campeon).toBeNull();
  });

  it('un torneo draft no es visible para un visitante sin cuenta: NO_ENCONTRADO', async () => {
    mockearDb({ torneo: filaTorneoBase({ estado: 'draft' }) });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    await expect(obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('un torneo draft sí es visible para quien administra la organización', async () => {
    mockearDb({ torneo: filaTorneoBase({ estado: 'draft' }), rolEnOrganizacion: 'owner' });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    await expect(
      obtenerFichaTorneo({ torneoId: TORNEO }, contextoCon('usuario-titular')),
    ).resolves.toMatchObject({ estado: 'draft' });
  });

  it('un torneo unlisted es visible completo por link directo', async () => {
    mockearDb({ torneo: filaTorneoBase({ visibilidad: 'unlisted' }) });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    await expect(obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE)).resolves.toMatchObject({
      visibilidad: 'unlisted',
    });
  });

  it('finalizado en formato knockout: el campeón es quien ganó el último partido de la última fase', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async (texto: string) => {
          const t = texto.trim();
          if (t.startsWith('SELECT t.id, t.nombre')) {
            return { rows: [filaTorneoBase({ estado: 'finished', formato: 'knockout' })] };
          }
          if (t.startsWith('SELECT count(*) FROM inscripcion')) return { rows: [{ count: '0' }] };
          if (t.startsWith('SELECT 1 FROM reglamento')) return { rows: [] };
          if (t.startsWith('SELECT id, tipo_fase FROM fase')) {
            return { rows: [{ id: FASE, tipo_fase: 'knockout' }] };
          }
          if (t.startsWith('SELECT equipo_local_id, equipo_visitante_id')) {
            return {
              rows: [
                {
                  equipo_local_id: EQUIPO_A,
                  equipo_visitante_id: EQUIPO_B,
                  goles_local: 2,
                  goles_visitante: 1,
                },
              ],
            };
          }
          if (t.startsWith('SELECT nombre, escudo_url FROM equipo')) {
            return { rows: [{ nombre: 'Equipo A', escudo_url: null }] };
          }
          return { rows: [] };
        },
      }),
    }));
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(ficha.campeon).toEqual({ equipoId: EQUIPO_A, nombre: 'Equipo A', escudoUrl: null });
  });

  it('un knockout con la final empatada no arriesga un campeón: null', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async (texto: string) => {
          const t = texto.trim();
          if (t.startsWith('SELECT t.id, t.nombre')) {
            return { rows: [filaTorneoBase({ estado: 'finished', formato: 'knockout' })] };
          }
          if (t.startsWith('SELECT count(*) FROM inscripcion')) return { rows: [{ count: '0' }] };
          if (t.startsWith('SELECT 1 FROM reglamento')) return { rows: [] };
          if (t.startsWith('SELECT id, tipo_fase FROM fase')) {
            return { rows: [{ id: FASE, tipo_fase: 'knockout' }] };
          }
          if (t.startsWith('SELECT equipo_local_id, equipo_visitante_id')) {
            return {
              rows: [
                {
                  equipo_local_id: EQUIPO_A,
                  equipo_visitante_id: EQUIPO_B,
                  goles_local: 1,
                  goles_visitante: 1,
                },
              ],
            };
          }
          return { rows: [] };
        },
      }),
    }));
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(ficha.campeon).toBeNull();
  });

  it('finalizado en formato league: el campeón es el líder de la tabla de la última fase', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async (texto: string) => {
          const t = texto.trim();
          if (t.startsWith('SELECT t.id, t.nombre')) {
            return { rows: [filaTorneoBase({ estado: 'finished', formato: 'league' })] };
          }
          if (t.startsWith('SELECT count(*) FROM inscripcion')) return { rows: [{ count: '0' }] };
          if (t.startsWith('SELECT 1 FROM reglamento')) return { rows: [] };
          if (t.startsWith('SELECT id, tipo_fase FROM fase')) {
            return { rows: [{ id: FASE, tipo_fase: 'league' }] };
          }
          if (t.startsWith('SELECT equipo_id, puntos, ajuste_puntos FROM posicion')) {
            return {
              rows: [
                { equipo_id: EQUIPO_A, puntos: 20, ajuste_puntos: 0 },
                { equipo_id: EQUIPO_B, puntos: 18, ajuste_puntos: 0 },
              ],
            };
          }
          if (t.startsWith('SELECT nombre, escudo_url FROM equipo')) {
            return { rows: [{ nombre: 'Equipo A', escudo_url: 'https://cdn.example.com/a.png' }] };
          }
          return { rows: [] };
        },
      }),
    }));
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    const ficha = await obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE);
    expect(ficha.campeon).toEqual({
      equipoId: EQUIPO_A,
      nombre: 'Equipo A',
      escudoUrl: 'https://cdn.example.com/a.png',
    });
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ torneo: null });
    const { obtenerFichaTorneo } = await import('./obtenerFichaTorneo');
    await expect(obtenerFichaTorneo({ torneoId: TORNEO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
