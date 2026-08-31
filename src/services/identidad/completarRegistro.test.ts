import { beforeEach, describe, expect, it, vi } from 'vitest';

function crearClienteFalso(
  filaUsuarioExistente: { id: string; perfil_deportivo_id: string } | null,
) {
  const consultas: Array<{ texto: string; valores?: unknown[] }> = [];

  const query = vi.fn(async (texto: string, valores?: unknown[]) => {
    consultas.push({ texto, valores });
    const sql = texto.trim().toUpperCase();

    if (sql.startsWith('SELECT ID, PERFIL_DEPORTIVO_ID')) {
      return { rows: filaUsuarioExistente ? [filaUsuarioExistente] : [] };
    }
    if (sql.startsWith('INSERT INTO PERFIL_DEPORTIVO')) {
      return { rows: [{ id: 'perfil-nuevo-id' }] };
    }
    return { rows: [] };
  });

  return { client: { query, release: vi.fn() }, consultas };
}

describe('completarRegistro', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('crea usuario y perfil_deportivo en el mismo movimiento cuando la cuenta no existía', async () => {
    const { client, consultas } = crearClienteFalso(null);
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ connect: async () => client }) }));
    const ejecutarAccionPendiente = vi.fn();
    vi.doMock('@/lib/accionesPendientes', () => ({ ejecutarAccionPendiente }));

    const { completarRegistro } = await import('./completarRegistro');
    const resultado = await completarRegistro(
      {
        usuarioId: '11111111-1111-1111-1111-111111111111',
        email: 'a@example.com',
        nombreVisible: 'Ana',
      },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(resultado).toEqual({
      usuarioId: '11111111-1111-1111-1111-111111111111',
      perfilDeportivoId: 'perfil-nuevo-id',
      yaExistia: false,
    });

    const textos = consultas.map((c) => c.texto.trim().toUpperCase());
    expect(textos[0]).toBe('BEGIN');
    expect(textos.some((t) => t.startsWith('INSERT INTO USUARIO'))).toBe(true);
    expect(textos.some((t) => t.startsWith('INSERT INTO PERFIL_DEPORTIVO'))).toBe(true);
    expect(textos.some((t) => t.startsWith('UPDATE USUARIO'))).toBe(true);
    expect(textos.at(-1)).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(ejecutarAccionPendiente).not.toHaveBeenCalled();

    vi.doUnmock('@/db/cliente');
    vi.doUnmock('@/lib/accionesPendientes');
  });

  it('es idempotente: si la cuenta ya existe, no la recrea', async () => {
    const { client, consultas } = crearClienteFalso({
      id: '11111111-1111-1111-1111-111111111111',
      perfil_deportivo_id: 'perfil-existente-id',
    });
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ connect: async () => client }) }));
    const ejecutarAccionPendiente = vi.fn();
    vi.doMock('@/lib/accionesPendientes', () => ({ ejecutarAccionPendiente }));

    const { completarRegistro } = await import('./completarRegistro');
    const resultado = await completarRegistro(
      {
        usuarioId: '11111111-1111-1111-1111-111111111111',
        email: 'a@example.com',
        nombreVisible: 'Ana',
      },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(resultado).toEqual({
      usuarioId: '11111111-1111-1111-1111-111111111111',
      perfilDeportivoId: 'perfil-existente-id',
      yaExistia: true,
    });

    const textos = consultas.map((c) => c.texto.trim().toUpperCase());
    expect(textos.some((t) => t.startsWith('INSERT'))).toBe(false);
    expect(ejecutarAccionPendiente).not.toHaveBeenCalled();

    vi.doUnmock('@/db/cliente');
    vi.doUnmock('@/lib/accionesPendientes');
  });

  it('ejecuta la acción pendiente solo cuando la cuenta se crea de cero', async () => {
    const { client } = crearClienteFalso(null);
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ connect: async () => client }) }));
    const ejecutarAccionPendiente = vi.fn();
    vi.doMock('@/lib/accionesPendientes', () => ({ ejecutarAccionPendiente }));

    const { completarRegistro } = await import('./completarRegistro');
    await completarRegistro(
      {
        usuarioId: '11111111-1111-1111-1111-111111111111',
        email: 'a@example.com',
        nombreVisible: 'Ana',
        accionPendiente: { tipo: 'seguir_torneo', datos: { torneoId: 't-1' } },
      },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(ejecutarAccionPendiente).toHaveBeenCalledWith(
      { tipo: 'seguir_torneo', datos: { torneoId: 't-1' } },
      '11111111-1111-1111-1111-111111111111',
    );

    vi.doUnmock('@/db/cliente');
    vi.doUnmock('@/lib/accionesPendientes');
  });

  it('si algo falla en la transacción, hace ROLLBACK y libera el cliente', async () => {
    const { client } = crearClienteFalso(null);
    client.query = vi.fn(async (texto: string) => {
      if (texto.trim().toUpperCase().startsWith('INSERT INTO USUARIO')) {
        throw new Error('boom');
      }
      return { rows: [] };
    });
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ connect: async () => client }) }));
    vi.doMock('@/lib/accionesPendientes', () => ({ ejecutarAccionPendiente: vi.fn() }));

    const { completarRegistro } = await import('./completarRegistro');
    await expect(
      completarRegistro(
        {
          usuarioId: '11111111-1111-1111-1111-111111111111',
          email: 'a@example.com',
          nombreVisible: 'Ana',
        },
        { usuarioId: null, permisos: {}, esSistema: true },
      ),
    ).rejects.toThrow('boom');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();

    vi.doUnmock('@/db/cliente');
    vi.doUnmock('@/lib/accionesPendientes');
  });
});
