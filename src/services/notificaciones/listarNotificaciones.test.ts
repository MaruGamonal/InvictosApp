import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function filaDe(id: string, tipo: string, fecha: string) {
  return {
    id,
    tipo,
    entidad_origen_tipo: 'partido',
    entidad_origen_id: 'partido-1',
    canal: 'in_app',
    estado: 'pending',
    fecha_generacion: new Date(fecha),
  };
}

describe('listarNotificaciones', () => {
  it('solo pide tipos accionables, nunca informativos', async () => {
    let tiposConsultados: string[] = [];
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async (_texto: string, valores: unknown[]) => {
          tiposConsultados = valores[1] as string[];
          return { rows: [] };
        },
      }),
    }));
    const { listarNotificaciones } = await import('./listarNotificaciones');
    await listarNotificaciones({}, contextoCon('usuario-1'));

    expect(tiposConsultados).toContain('team_invitation');
    expect(tiposConsultados).not.toContain('tournament_published');
    expect(tiposConsultados).not.toContain('result_published');
  });

  it('pagina por cursor sin repetir ni saltear', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async () => ({
          rows: [
            filaDe('n1', 'team_invitation', '2026-01-01T00:00:00Z'),
            filaDe('n2', 'match_scheduled', '2026-01-02T00:00:00Z'),
            filaDe('n3', 'match_rescheduled', '2026-01-03T00:00:00Z'),
          ],
        }),
      }),
    }));
    const { listarNotificaciones } = await import('./listarNotificaciones');
    const resultado = await listarNotificaciones({ tamanoPagina: 2 }, contextoCon('usuario-1'));

    expect(resultado.notificaciones.map((n) => n.id)).toEqual(['n1', 'n2']);
    expect(resultado.cursorSiguiente).not.toBeNull();
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { listarNotificaciones } = await import('./listarNotificaciones');
    await expect(listarNotificaciones({}, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });
});
