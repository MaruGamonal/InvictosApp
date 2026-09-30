import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

beforeEach(() => vi.resetModules());

const ORGANIZADOR: Contexto = { usuarioId: 'usr-org', permisos: {}, esSistema: false };

function mockearDb(opciones: { hayObjecionAbierta?: boolean } = {}) {
  const escrituras: Array<{ sql: string; parametros: unknown[] }> = [];
  const cliente = {
    query: async (texto: string, parametros: unknown[] = []) => {
      const sql = texto.trim();
      escrituras.push({ sql, parametros });
      if (sql.startsWith('UPDATE disputa_resultado')) {
        return { rows: opciones.hayObjecionAbierta === false ? [] : [{ id: 'disp-1' }] };
      }
      return { rows: [] };
    },
    release: () => {},
  };
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      connect: async () => cliente,
      query: async () => ({
        rows: [
          {
            torneo_id: 'to-1',
            equipo_local_id: 'eq-local',
            equipo_visitante_id: 'eq-visita',
            estado_resultado: 'disputed',
          },
        ],
      }),
    }),
  }));
  vi.doMock('@/lib/cache', () => ({
    invalidarCacheTorneo: vi.fn(),
    invalidarCacheEquipo: vi.fn(),
  }));
  return escrituras;
}

const RESOLUCION = 'Revisé la planilla y el resultado es el correcto.';
const PARTIDO_ID = '11111111-1111-1111-1111-111111111111';

describe('resolverDisputa', () => {
  it('el organizador rechaza la objeción y el resultado queda confirmado', async () => {
    const escrituras = mockearDb();
    vi.doMock('@/lib/permisos', async (original) => ({
      ...(await original<Record<string, unknown>>()),
      verificarPermisoTorneo: async () => {},
    }));
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { resolverDisputa } = await import('./resolverDisputa');

    const resultado = await resolverDisputa(
      { partidoId: PARTIDO_ID, resolucion: RESOLUCION },
      ORGANIZADOR,
    );

    expect(resultado).toEqual({ estadoDisputa: 'rejected', estadoResultado: 'confirmed' });
    const cierre = escrituras.find((e) => e.sql.startsWith('UPDATE disputa_resultado'));
    expect(cierre!.sql).toContain("estado = 'rejected'");
    // El candado: si otra persona la resolvió mientras tanto, no hay
    // filas y no se pisa su decisión.
    expect(cierre!.sql).toContain("estado = 'open'");
    const partido = escrituras.find((e) => e.sql.startsWith('UPDATE partido'));
    expect(partido!.sql).toContain("estado_resultado = 'confirmed'");
    // No es una confirmación por vencimiento: la decidió una persona.
    expect(partido!.sql).toContain('confirmado_por_vencimiento = false');
  });

  it('quien no gestiona el torneo no resuelve objeciones', async () => {
    mockearDb();
    vi.doMock('@/lib/permisos', async (original) => ({
      ...(await original<Record<string, unknown>>()),
      verificarPermisoTorneo: async () => {
        const { crearError } = await import('@/lib/errores');
        throw crearError('SIN_PERMISO');
      },
    }));
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { resolverDisputa } = await import('./resolverDisputa');

    const error = await resolverDisputa(
      { partidoId: PARTIDO_ID, resolucion: RESOLUCION },
      ORGANIZADOR,
    ).catch((e) => e);

    expect(error.codigo).toBe('SIN_PERMISO');
  });

  it('una objeción ya resuelta no se resuelve dos veces', async () => {
    mockearDb({ hayObjecionAbierta: false });
    vi.doMock('@/lib/permisos', async (original) => ({
      ...(await original<Record<string, unknown>>()),
      verificarPermisoTorneo: async () => {},
    }));
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { resolverDisputa } = await import('./resolverDisputa');

    const error = await resolverDisputa(
      { partidoId: PARTIDO_ID, resolucion: RESOLUCION },
      ORGANIZADOR,
    ).catch((e) => e);

    expect(error.codigo).toBe('OBJECION_NO_ABIERTA');
  });

  it('una resolución vacía no pasa la validación', async () => {
    mockearDb();
    vi.doMock('@/lib/permisos', async (original) => ({
      ...(await original<Record<string, unknown>>()),
      verificarPermisoTorneo: async () => {},
    }));
    vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: vi.fn() }));
    const { resolverDisputa } = await import('./resolverDisputa');

    const error = await resolverDisputa(
      { partidoId: PARTIDO_ID, resolucion: '  ' },
      ORGANIZADOR,
    ).catch((e) => e);

    expect(error.codigo).toBe('DATOS_INVALIDOS');
  });
});
