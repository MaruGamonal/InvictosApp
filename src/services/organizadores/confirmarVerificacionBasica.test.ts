import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';
const TITULAR = 'titular-1';

function mockearDb(usuarioTitularId: string | null) {
  const query = vi.fn(async (texto: string) => {
    const sql = texto.toUpperCase();
    if (sql.startsWith('SELECT USUARIO_TITULAR_ID')) {
      return { rows: usuarioTitularId ? [{ usuario_titular_id: usuarioTitularId }] : [] };
    }
    return { rows: [] };
  });
  vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
  return query;
}

beforeEach(() => {
  vi.resetModules();
});

describe('confirmarVerificacionBasica', () => {
  it('confirma la organización cuando quien volvió con sesión es el titular', async () => {
    const query = mockearDb(TITULAR);
    const { confirmarVerificacionBasica } = await import('./confirmarVerificacionBasica');

    const resultado = await confirmarVerificacionBasica(
      { organizacionId: ORG },
      contextoCon(TITULAR),
    );

    expect(resultado).toEqual({ nivelVerificacion: 'basic' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE organizacion'), [ORG]);
    vi.doUnmock('@/db/cliente');
  });

  it('rechaza si quien volvió con sesión no es el titular de esa organización', async () => {
    mockearDb(TITULAR);
    const { confirmarVerificacionBasica } = await import('./confirmarVerificacionBasica');
    await expect(
      confirmarVerificacionBasica({ organizacionId: ORG }, contextoCon('otra-persona')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    vi.doUnmock('@/db/cliente');
  });

  it('organización inexistente da NO_ENCONTRADO', async () => {
    mockearDb(null);
    const { confirmarVerificacionBasica } = await import('./confirmarVerificacionBasica');
    await expect(
      confirmarVerificacionBasica({ organizacionId: ORG }, contextoCon(TITULAR)),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    vi.doUnmock('@/db/cliente');
  });
});
