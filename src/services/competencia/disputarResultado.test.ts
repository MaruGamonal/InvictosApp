import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

beforeEach(() => vi.resetModules());

const CAPITANA_RIVAL: Contexto = { usuarioId: 'usr-rival', permisos: {}, esSistema: false };
const AJENO: Contexto = { usuarioId: 'usr-ajeno', permisos: {}, esSistema: false };

const PARTIDO = {
  torneo_id: 'to-1',
  equipo_local_id: 'eq-local',
  equipo_visitante_id: 'eq-visita',
  estado_resultado: 'loaded',
  // Lo cargó la capitana del local: la que puede responder es la visita.
  cargado_por_usuario_id: 'usr-cargo',
};

/**
 * `usr-cargo` es capitán del local; `usr-rival`, de la visita. Con eso
 * alcanza para ejercitar quién puede objetar y quién no.
 */
function mockearDb(
  opciones: { partido?: Record<string, unknown>; objecionAbierta?: boolean } = {},
) {
  const escrituras: Array<{ sql: string; parametros: unknown[] }> = [];
  const cliente = {
    query: async (texto: string, parametros: unknown[] = []) => {
      const sql = texto.trim();
      escrituras.push({ sql, parametros });
      if (sql.startsWith('INSERT INTO disputa_resultado')) return { rows: [{ id: 'disp-1' }] };
      if (sql.startsWith('UPDATE partido')) return { rows: [{ id: 'pa-1' }] };
      return { rows: [] };
    },
    release: () => {},
  };
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      connect: async () => cliente,
      query: async (texto: string, parametros: unknown[] = []) => {
        const sql = texto.trim();
        if (sql.startsWith('SELECT torneo_id')) {
          return { rows: [{ ...PARTIDO, ...opciones.partido }] };
        }
        if (sql.startsWith('SELECT id FROM perfil_deportivo')) {
          return { rows: [{ id: `perfil-${parametros[0]}` }] };
        }
        if (sql.includes('FROM integrante_equipo')) {
          const [perfilId, equipoId] = parametros as [string, string];
          const esCapitan =
            (perfilId === 'perfil-usr-cargo' && equipoId === 'eq-local') ||
            (perfilId === 'perfil-usr-rival' && equipoId === 'eq-visita');
          return { rows: esCapitan ? [{ rol_equipo: 'captain' }] : [] };
        }
        if (sql.startsWith('SELECT 1 FROM disputa_resultado')) {
          return { rows: opciones.objecionAbierta ? [{ existe: 1 }] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
  vi.doMock('@/lib/cache', () => ({
    invalidarCacheTorneo: vi.fn(),
    invalidarCacheEquipo: vi.fn(),
  }));
  return escrituras;
}

const MOTIVO = 'El resultado fue 2 a 2, no 3 a 1.';

describe('disputarResultado', () => {
  it('la capitana del equipo que no cargó objeta, y el partido queda en disputed', async () => {
    const escrituras = mockearDb();
    const notificar = vi.fn();
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar }));
    vi.doMock('@/lib/permisos', async (original) => ({
      ...(await original<Record<string, unknown>>()),
      usuariosQueGestionanElTorneo: async () => ['usr-organizador'],
    }));
    const { disputarResultado } = await import('./disputarResultado');

    const resultado = await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: MOTIVO },
      CAPITANA_RIVAL,
    );

    expect(resultado).toEqual({ estadoResultado: 'disputed', disputaId: 'disp-1' });
    const insert = escrituras.find((e) => e.sql.startsWith('INSERT INTO disputa_resultado'));
    // La objeción queda a nombre del equipo que responde, no del que cargó.
    expect(insert!.parametros).toContain('eq-visita');
    expect(insert!.parametros).toContain(MOTIVO);
    const update = escrituras.find((e) => e.sql.startsWith('UPDATE partido'));
    expect(update!.sql).toContain("estado_resultado = 'disputed'");
    // El UPDATE exige que siga en `loaded`: si alguien lo confirmó
    // mientras tanto, la objeción llegó tarde y no se guarda a medias.
    expect(update!.sql).toContain("estado_resultado = 'loaded'");
  });

  /** La razón de ser del permiso: cualquiera no objeta el partido de otros. */
  it('alguien que no es de ninguno de los dos equipos no puede objetar', async () => {
    mockearDb();
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { disputarResultado } = await import('./disputarResultado');

    const error = await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: MOTIVO },
      AJENO,
    ).catch((e) => e);

    expect(error.codigo).toBe('SIN_PERMISO');
  });

  it('quien cargó el resultado no se objeta a sí mismo', async () => {
    mockearDb();
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { disputarResultado } = await import('./disputarResultado');

    const error = await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: MOTIVO },
      { usuarioId: 'usr-cargo', permisos: {}, esSistema: false },
    ).catch((e) => e);

    expect(error.codigo).toBe('SIN_PERMISO');
  });

  it('un resultado ya confirmado no se objeta', async () => {
    mockearDb({ partido: { estado_resultado: 'confirmed' } });
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { disputarResultado } = await import('./disputarResultado');

    const error = await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: MOTIVO },
      CAPITANA_RIVAL,
    ).catch((e) => e);

    expect(error.codigo).toBe('RESULTADO_NO_OBJETABLE');
  });

  it('no se abren dos objeciones sobre el mismo resultado', async () => {
    mockearDb({ objecionAbierta: true });
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { disputarResultado } = await import('./disputarResultado');

    const error = await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: MOTIVO },
      CAPITANA_RIVAL,
    ).catch((e) => e);

    expect(error.codigo).toBe('OBJECION_YA_ABIERTA');
  });

  it('un motivo demasiado corto no pasa la validación', async () => {
    mockearDb();
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { disputarResultado } = await import('./disputarResultado');

    const error = await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: 'no' },
      CAPITANA_RIVAL,
    ).catch((e) => e);

    expect(error.codigo).toBe('DATOS_INVALIDOS');
  });

  /**
   * Le llega a quien puede resolverla. Avisarle a los seguidores de una
   * objeción sería ruido: no pueden hacer nada con eso.
   */
  it('avisa a quienes gestionan el torneo, y no a los seguidores', async () => {
    mockearDb();
    const notificar = vi.fn();
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar }));
    vi.doMock('@/lib/permisos', async (original) => ({
      ...(await original<Record<string, unknown>>()),
      usuariosQueGestionanElTorneo: async () => ['usr-organizador'],
    }));
    const { disputarResultado } = await import('./disputarResultado');

    await disputarResultado(
      { partidoId: '11111111-1111-1111-1111-111111111111', motivo: MOTIVO },
      CAPITANA_RIVAL,
    );

    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'result_disputed',
        destinatarios: { usuarioIds: ['usr-organizador'] },
      }),
      CAPITANA_RIVAL,
    );
  });
});
