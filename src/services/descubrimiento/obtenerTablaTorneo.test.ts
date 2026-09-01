import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const FASE_GRUPOS = '33333333-3333-3333-3333-333333333333';

const obtenerTablaMock = vi.fn(async () => [
  { grupoId: 'g1', nombre: 'Zona A', provisorio: false, filas: [] },
]);

beforeEach(() => {
  vi.resetModules();
  obtenerTablaMock.mockClear();
  vi.doMock('@/services/posiciones/obtenerTabla', () => ({ obtenerTabla: obtenerTablaMock }));
});

function mockearDb(opciones: {
  torneo?: { id: string; organizacion_id: string; estado: string } | null;
  fase?: { id: string } | null;
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
        if (t.startsWith("SELECT id FROM fase WHERE torneo_id = $1 AND tipo_fase = 'league'")) {
          const fase = opciones.fase === undefined ? { id: FASE_GRUPOS } : opciones.fase;
          return { rows: fase ? [fase] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerTablaTorneo', () => {
  it('delega en obtenerTabla con la fase de tipo league más reciente', async () => {
    mockearDb({});
    const { obtenerTablaTorneo } = await import('./obtenerTablaTorneo');

    const tabla = await obtenerTablaTorneo({ torneoId: TORNEO }, VISITANTE);

    expect(obtenerTablaMock).toHaveBeenCalledWith({ faseId: FASE_GRUPOS }, VISITANTE);
    expect(tabla).toEqual([{ grupoId: 'g1', nombre: 'Zona A', provisorio: false, filas: [] }]);
  });

  it('un torneo de eliminación directa pura, sin fase league: lista vacía, no error', async () => {
    mockearDb({ fase: null });
    const { obtenerTablaTorneo } = await import('./obtenerTablaTorneo');

    const tabla = await obtenerTablaTorneo({ torneoId: TORNEO }, VISITANTE);

    expect(tabla).toEqual([]);
    expect(obtenerTablaMock).not.toHaveBeenCalled();
  });

  it('un torneo draft no es visible para un visitante: NO_ENCONTRADO', async () => {
    mockearDb({ torneo: { id: TORNEO, organizacion_id: ORG, estado: 'draft' } });
    const { obtenerTablaTorneo } = await import('./obtenerTablaTorneo');
    await expect(obtenerTablaTorneo({ torneoId: TORNEO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ torneo: null });
    const { obtenerTablaTorneo } = await import('./obtenerTablaTorneo');
    await expect(obtenerTablaTorneo({ torneoId: TORNEO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
