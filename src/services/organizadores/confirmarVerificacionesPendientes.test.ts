import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(filas: Array<{ id: string; nombre: string }>) {
  const consultas: Array<{ texto: string; parametros: unknown[] }> = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, parametros: unknown[]) => {
        consultas.push({ texto, parametros });
        return { rows: filas };
      },
    }),
  }));
  return consultas;
}

describe('confirmarVerificacionesPendientes', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb([]);
    const { confirmarVerificacionesPendientes } =
      await import('./confirmarVerificacionesPendientes');
    await expect(
      confirmarVerificacionesPendientes(undefined, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  /**
   * El bug reportado en vivo: el id viajaba solo en la URL de vuelta y
   * la plantilla del correo podía no reenviarla. Sin nada que buscar en
   * la base, tocar el enlace confirmaba la cuenta y dejaba la
   * organización sin verificar.
   */
  it('verifica la organización que había quedado pendiente', async () => {
    const consultas = mockearDb([{ id: 'org-1', nombre: 'Liga Posadas' }]);
    const { confirmarVerificacionesPendientes } =
      await import('./confirmarVerificacionesPendientes');

    const aplicadas = await confirmarVerificacionesPendientes(undefined, contextoCon('u1'));

    expect(aplicadas).toEqual([{ organizacionId: 'org-1', nombre: 'Liga Posadas' }]);
    expect(consultas[0]?.texto).toContain("nivel_verificacion = 'basic'");
    // El pedido queda saldado: si no, el próximo enlace lo repetiría.
    expect(consultas[0]?.texto).toContain('verificacion_solicitada_en = NULL');
  });

  it('sin nada pendiente, no devuelve nada y no rompe', async () => {
    mockearDb([]);
    const { confirmarVerificacionesPendientes } =
      await import('./confirmarVerificacionesPendientes');
    await expect(confirmarVerificacionesPendientes(undefined, contextoCon('u1'))).resolves.toEqual(
      [],
    );
  });

  /**
   * Las tres condiciones que hacen que esto no sea una puerta abierta:
   * solo organizaciones **propias**, solo pedidos **recientes** y solo
   * las que todavía están **sin verificar**.
   */
  it('solo toca organizaciones propias, con pedido reciente y sin verificar', async () => {
    const consultas = mockearDb([]);
    const { confirmarVerificacionesPendientes } =
      await import('./confirmarVerificacionesPendientes');

    await confirmarVerificacionesPendientes(undefined, contextoCon('u1'));

    const { texto, parametros } = consultas[0]!;
    expect(texto).toContain('usuario_titular_id = $1');
    expect(texto).toContain('verificacion_solicitada_en IS NOT NULL');
    expect(texto).toContain("nivel_verificacion = 'unverified'");
    expect(texto).toContain("now() - ($2 || ' hours')::interval");
    expect(parametros[0]).toBe('u1');
  });
});
