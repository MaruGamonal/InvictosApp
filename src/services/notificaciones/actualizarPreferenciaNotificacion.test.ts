import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const USUARIO: Contexto = { usuarioId: '11111111-1111-1111-1111-111111111111', permisos: {}, esSistema: false };
const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

beforeEach(() => vi.resetModules());

function mockearDb() {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto: texto.trim(), valores });
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('actualizarPreferenciaNotificacion', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb();
    const { actualizarPreferenciaNotificacion } = await import('./actualizarPreferenciaNotificacion');
    await expect(
      actualizarPreferenciaNotificacion(
        { categoria: 'followed_results', canal: 'in_app', activo: false },
        VISITANTE,
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('apagar una categoría informativa inserta la fila de mute', async () => {
    const consultas = mockearDb();
    const { actualizarPreferenciaNotificacion } = await import('./actualizarPreferenciaNotificacion');

    await actualizarPreferenciaNotificacion(
      { categoria: 'followed_results', canal: 'in_app', activo: false },
      USUARIO,
    );

    expect(consultas[0]!.texto).toMatch(/^INSERT INTO preferencia_notificacion/);
    expect(consultas[0]!.valores).toEqual([USUARIO.usuarioId, 'followed_results', 'in_app']);
  });

  it('prender una categoría borra la fila de mute', async () => {
    const consultas = mockearDb();
    const { actualizarPreferenciaNotificacion } = await import('./actualizarPreferenciaNotificacion');

    await actualizarPreferenciaNotificacion(
      { categoria: 'followed_results', canal: 'in_app', activo: true },
      USUARIO,
    );

    expect(consultas[0]!.texto).toMatch(/^DELETE FROM preferencia_notificacion/);
  });

  it('apagar el canal in_app de una categoría accionable, DATOS_INVALIDOS', async () => {
    mockearDb();
    const { actualizarPreferenciaNotificacion } = await import('./actualizarPreferenciaNotificacion');

    await expect(
      actualizarPreferenciaNotificacion(
        { categoria: 'team_invitation', canal: 'in_app', activo: false },
        USUARIO,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('apagar el canal email de una categoría accionable sí se permite', async () => {
    const consultas = mockearDb();
    const { actualizarPreferenciaNotificacion } = await import('./actualizarPreferenciaNotificacion');

    await actualizarPreferenciaNotificacion(
      { categoria: 'team_invitation', canal: 'email', activo: false },
      USUARIO,
    );

    expect(consultas[0]!.texto).toMatch(/^INSERT INTO preferencia_notificacion/);
  });
});
