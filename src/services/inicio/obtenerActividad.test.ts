import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const USUARIO = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TORNEO = '11111111-1111-1111-1111-111111111111';
const EQUIPO_A = '22222222-2222-2222-2222-222222222222';
const EQUIPO_B = '33333333-3333-3333-3333-333333333333';
const PARTIDO = '44444444-4444-4444-4444-444444444444';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  seguidos?: Array<{ tipo_seguido: 'tournament' | 'team'; entidad_seguida_id: string }>;
  notificaciones?: Array<Record<string, unknown>>;
  inscripciones?: Array<Record<string, unknown>>;
  torneos?: Array<Record<string, unknown>>;
  partidos?: Array<Record<string, unknown>>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT tipo_seguido, entidad_seguida_id FROM seguimiento')) {
          return { rows: opciones.seguidos ?? [] };
        }
        if (
          t.startsWith('SELECT id, tipo, entidad_origen_tipo, entidad_origen_id, fecha_generacion')
        ) {
          return { rows: opciones.notificaciones ?? [] };
        }
        if (t.startsWith('SELECT i.torneo_id, i.equipo_id, i.fecha_resolucion')) {
          return { rows: opciones.inscripciones ?? [] };
        }
        if (t.startsWith('SELECT t.id, t.nombre, t.imagen_url')) {
          return { rows: opciones.torneos ?? [] };
        }
        if (t.startsWith('SELECT p.id, p.torneo_id')) {
          return { rows: opciones.partidos ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerActividad', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { obtenerActividad } = await import('./obtenerActividad');
    await expect(obtenerActividad({}, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('sin ningún seguimiento (ni propio por auto-seguimiento), sinSeguimientos true y sin items', async () => {
    mockearDb({ seguidos: [] });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado).toEqual({ items: [], sinSeguimientos: true });
  });

  it('un torneo empezó a jugarse: resuelve el item con nombre e imagen del torneo', async () => {
    mockearDb({
      seguidos: [{ tipo_seguido: 'tournament', entidad_seguida_id: TORNEO }],
      notificaciones: [
        {
          id: 'notif-1',
          tipo: 'tournament_started',
          entidad_origen_tipo: 'torneo',
          entidad_origen_id: TORNEO,
          fecha_generacion: new Date('2026-04-01T12:00:00Z'),
        },
      ],
      torneos: [
        {
          id: TORNEO,
          nombre: 'Copa Otoño',
          imagen_url: 'https://cdn.example.com/copa.png',
          organizacion_logo_url: null,
        },
      ],
    });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado.sinSeguimientos).toBe(false);
    expect(resultado.items).toEqual([
      {
        tipo: 'tournament_started',
        id: 'notif-1',
        fecha: '2026-04-01T12:00:00.000Z',
        torneo: { id: TORNEO, nombre: 'Copa Otoño', imagenUrl: 'https://cdn.example.com/copa.png' },
      },
    ]);
  });

  it('un resultado publicado: resuelve equipos, goles y jugador del partido', async () => {
    mockearDb({
      seguidos: [{ tipo_seguido: 'tournament', entidad_seguida_id: TORNEO }],
      notificaciones: [
        {
          id: 'notif-2',
          tipo: 'result_published',
          entidad_origen_tipo: 'partido',
          entidad_origen_id: PARTIDO,
          fecha_generacion: new Date('2026-04-02T18:00:00Z'),
        },
      ],
      partidos: [
        {
          id: PARTIDO,
          torneo_id: TORNEO,
          torneo_nombre: 'Copa Otoño',
          torneo_imagen_url: null,
          organizacion_logo_url: 'https://cdn.example.com/logo-org.png',
          goles_local: 2,
          goles_visitante: 1,
          local_id: EQUIPO_A,
          local_nombre: 'Los Pibes',
          local_escudo: null,
          visitante_id: EQUIPO_B,
          visitante_nombre: 'Rival FC',
          visitante_escudo: null,
          jugador_del_partido_perfil_id: 'perfil-1',
          jugador_del_partido_nombre: 'Juan',
        },
      ],
    });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado.items).toEqual([
      {
        tipo: 'result_published',
        id: 'notif-2',
        fecha: '2026-04-02T18:00:00.000Z',
        partidoId: PARTIDO,
        torneo: {
          id: TORNEO,
          nombre: 'Copa Otoño',
          imagenUrl: 'https://cdn.example.com/logo-org.png',
        },
        equipoLocal: { id: EQUIPO_A, nombre: 'Los Pibes', escudoUrl: null },
        equipoVisitante: { id: EQUIPO_B, nombre: 'Rival FC', escudoUrl: null },
        golesLocal: 2,
        golesVisitante: 1,
        jugadorDelPartido: { perfilId: 'perfil-1', nombreVisible: 'Juan' },
      },
    ]);
  });

  it('un resultado sin jugador del partido elegido: jugadorDelPartido null', async () => {
    mockearDb({
      seguidos: [{ tipo_seguido: 'tournament', entidad_seguida_id: TORNEO }],
      notificaciones: [
        {
          id: 'notif-3',
          tipo: 'result_published',
          entidad_origen_tipo: 'partido',
          entidad_origen_id: PARTIDO,
          fecha_generacion: new Date('2026-04-02T18:00:00Z'),
        },
      ],
      partidos: [
        {
          id: PARTIDO,
          torneo_id: TORNEO,
          torneo_nombre: 'Copa Otoño',
          torneo_imagen_url: null,
          organizacion_logo_url: null,
          goles_local: 0,
          goles_visitante: 0,
          local_id: EQUIPO_A,
          local_nombre: 'Los Pibes',
          local_escudo: null,
          visitante_id: EQUIPO_B,
          visitante_nombre: 'Rival FC',
          visitante_escudo: null,
          jugador_del_partido_perfil_id: null,
          jugador_del_partido_nombre: null,
        },
      ],
    });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado.items[0]).toMatchObject({ jugadorDelPartido: null });
  });

  it('un equipo seguido se sumó a un torneo: item team_joined_tournament', async () => {
    mockearDb({
      seguidos: [{ tipo_seguido: 'team', entidad_seguida_id: EQUIPO_A }],
      inscripciones: [
        {
          torneo_id: TORNEO,
          equipo_id: EQUIPO_A,
          fecha_resolucion: new Date('2026-03-01T10:00:00Z'),
          torneo_nombre: 'Copa Otoño',
          torneo_imagen_url: null,
          organizacion_logo_url: null,
          equipo_nombre: 'Los Pibes',
          escudo_url: null,
        },
      ],
    });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado.items).toEqual([
      {
        tipo: 'team_joined_tournament',
        id: `insc:${TORNEO}:${EQUIPO_A}`,
        fecha: '2026-03-01T10:00:00.000Z',
        torneo: { id: TORNEO, nombre: 'Copa Otoño', imagenUrl: null },
        equipo: { id: EQUIPO_A, nombre: 'Los Pibes', escudoUrl: null },
      },
    ]);
  });

  it('combina items de las dos fuentes y los ordena por fecha, más reciente primero', async () => {
    mockearDb({
      seguidos: [
        { tipo_seguido: 'tournament', entidad_seguida_id: TORNEO },
        { tipo_seguido: 'team', entidad_seguida_id: EQUIPO_A },
      ],
      notificaciones: [
        {
          id: 'notif-viejo',
          tipo: 'tournament_started',
          entidad_origen_tipo: 'torneo',
          entidad_origen_id: TORNEO,
          fecha_generacion: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      torneos: [
        { id: TORNEO, nombre: 'Copa Otoño', imagen_url: null, organizacion_logo_url: null },
      ],
      inscripciones: [
        {
          torneo_id: TORNEO,
          equipo_id: EQUIPO_A,
          fecha_resolucion: new Date('2026-03-01T00:00:00Z'),
          torneo_nombre: 'Copa Otoño',
          torneo_imagen_url: null,
          organizacion_logo_url: null,
          equipo_nombre: 'Los Pibes',
          escudo_url: null,
        },
      ],
    });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado.items.map((item) => item.tipo)).toEqual([
      'team_joined_tournament',
      'tournament_started',
    ]);
  });

  it('una notificación cuyo torneo ya no existe se omite, sin romper el resto', async () => {
    mockearDb({
      seguidos: [{ tipo_seguido: 'tournament', entidad_seguida_id: TORNEO }],
      notificaciones: [
        {
          id: 'notif-huerfano',
          tipo: 'tournament_finished',
          entidad_origen_tipo: 'torneo',
          entidad_origen_id: TORNEO,
          fecha_generacion: new Date('2026-04-01T00:00:00Z'),
        },
      ],
      torneos: [],
    });
    const { obtenerActividad } = await import('./obtenerActividad');
    const resultado = await obtenerActividad({}, contextoCon(USUARIO));
    expect(resultado.items).toEqual([]);
  });
});
