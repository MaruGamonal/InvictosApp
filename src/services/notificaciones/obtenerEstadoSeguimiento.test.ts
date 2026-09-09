import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { sigue?: boolean }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async () => ({ rows: opciones.sigue ? [{}] : [] }),
    }),
  }));
}

describe('obtenerEstadoSeguimiento', () => {
  it('sin sesión, false sin error (no es una acción, es un dato de lectura)', async () => {
    mockearDb({});
    const { obtenerEstadoSeguimiento } = await import('./obtenerEstadoSeguimiento');
    const resultado = await obtenerEstadoSeguimiento(
      { tipoSeguido: 'team', entidadId: '11111111-1111-1111-1111-111111111111' },
      contextoCon(null),
    );
    expect(resultado).toEqual({ siguiendo: false });
  });

  it('con sesión y sin fila en seguimiento, false', async () => {
    mockearDb({ sigue: false });
    const { obtenerEstadoSeguimiento } = await import('./obtenerEstadoSeguimiento');
    const resultado = await obtenerEstadoSeguimiento(
      { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({ siguiendo: false });
  });

  it('con sesión y fila existente, true', async () => {
    mockearDb({ sigue: true });
    const { obtenerEstadoSeguimiento } = await import('./obtenerEstadoSeguimiento');
    const resultado = await obtenerEstadoSeguimiento(
      { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({ siguiendo: true });
  });
});
