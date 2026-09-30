import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { FilaParaDespachar } from './_despachoDeCorreo';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.invicta.com.ar');
});

interface Actualizacion {
  sql: string;
  parametros: unknown[];
}

/**
 * Un pool de mentira que responde las tres consultas que hace el
 * despacho (nombres de equipo, nombres de torneo, casillas) y anota los
 * UPDATE, que es lo que decide en qué estado queda cada notificación.
 */
function mockearPool(opciones: {
  casillasConfirmadas: string[];
  nombres?: Record<string, string>;
}) {
  const actualizaciones: Actualizacion[] = [];
  const pool = {
    query: async (texto: string, parametros: unknown[] = []) => {
      const sql = texto.trim();
      if (sql.startsWith('UPDATE notificacion')) {
        actualizaciones.push({ sql, parametros });
        return { rows: [] };
      }
      if (sql.startsWith('SELECT id, email FROM usuario')) {
        const pedidos = (parametros[0] as string[][])[0] ?? [];
        const ids = Array.isArray(pedidos) ? pedidos : (parametros[0] as string[]);
        return {
          rows: (ids as string[])
            .filter((id) => opciones.casillasConfirmadas.includes(id))
            .map((id) => ({ id, email: `${id}@ejemplo.com` })),
        };
      }
      if (sql.startsWith('SELECT id, nombre FROM')) {
        const ids = (parametros[0] as string[]) ?? [];
        return {
          rows: ids
            .filter((id) => opciones.nombres?.[id])
            .map((id) => ({ id, nombre: opciones.nombres![id] })),
        };
      }
      return { rows: [] };
    },
  } as unknown as Pool;
  return { pool, actualizaciones };
}

const FILA: FilaParaDespachar = {
  id: 'notif-1',
  usuarioId: 'usr-1',
  tipo: 'team_invitation',
  entidadOrigenTipo: 'equipo',
  entidadOrigenId: 'eq-1',
};

describe('despacharFilas', () => {
  it('sin filas, no consulta nada', async () => {
    const { despacharFilas } = await import('./_despachoDeCorreo');
    const { pool, actualizaciones } = mockearPool({ casillasConfirmadas: [] });

    expect(await despacharFilas(pool, [])).toEqual({ enviados: 0, fallidos: 0, omitidos: 0 });
    expect(actualizaciones).toHaveLength(0);
  });

  /**
   * El caso de desarrollo, y el de producción antes de que alguien
   * cargue la clave. Lo importante es que **no se cuente un intento**:
   * si contara, los cinco reintentos se gastarían contra una
   * configuración que todavía no existe, y el aviso se perdería para
   * cuando sí existiera.
   */
  it('sin proveedor configurado, omite sin tocar la fila', async () => {
    vi.doMock('@/lib/correo', () => ({
      hayProveedorDeCorreo: () => false,
      enviarCorreo: vi.fn(),
    }));
    const { despacharFilas } = await import('./_despachoDeCorreo');
    const { pool, actualizaciones } = mockearPool({ casillasConfirmadas: ['usr-1'] });

    const resumen = await despacharFilas(pool, [FILA]);

    expect(resumen).toEqual({ enviados: 0, fallidos: 0, omitidos: 1 });
    expect(actualizaciones).toHaveLength(0);
  });

  it('manda y deja la notificación entregada', async () => {
    const enviarCorreo = vi.fn(async () => {});
    vi.doMock('@/lib/correo', () => ({ hayProveedorDeCorreo: () => true, enviarCorreo }));
    const { despacharFilas } = await import('./_despachoDeCorreo');
    const { pool, actualizaciones } = mockearPool({
      casillasConfirmadas: ['usr-1'],
      nombres: { 'eq-1': 'Deportivo Pichincha' },
    });

    const resumen = await despacharFilas(pool, [FILA]);

    expect(resumen.enviados).toBe(1);
    expect(enviarCorreo).toHaveBeenCalledWith(
      expect.objectContaining({
        para: 'usr-1@ejemplo.com',
        asunto: 'Te invitaron a un equipo — Deportivo Pichincha',
      }),
    );
    expect(actualizaciones[0]!.sql).toContain("estado = 'delivered'");
  });

  /**
   * Escribirle a una casilla que nadie verificó es la forma más rápida
   * de que el dominio termine en spam, y de paso de mandarle correo a
   * alguien que no pidió nada.
   */
  it('no le escribe a una casilla sin confirmar', async () => {
    const enviarCorreo = vi.fn(async () => {});
    vi.doMock('@/lib/correo', () => ({ hayProveedorDeCorreo: () => true, enviarCorreo }));
    const { despacharFilas } = await import('./_despachoDeCorreo');
    const { pool, actualizaciones } = mockearPool({ casillasConfirmadas: [] });

    const resumen = await despacharFilas(pool, [FILA]);

    expect(resumen).toEqual({ enviados: 0, fallidos: 0, omitidos: 1 });
    expect(enviarCorreo).not.toHaveBeenCalled();
    expect(actualizaciones).toHaveLength(0);
  });

  it('un fallo deja la fila en failed con el motivo, y no corta el lote', async () => {
    const enviarCorreo = vi
      .fn()
      .mockRejectedValueOnce(new Error('El proveedor respondió 503'))
      .mockResolvedValueOnce(undefined);
    vi.doMock('@/lib/correo', () => ({ hayProveedorDeCorreo: () => true, enviarCorreo }));
    const { despacharFilas } = await import('./_despachoDeCorreo');
    const { pool, actualizaciones } = mockearPool({ casillasConfirmadas: ['usr-1', 'usr-2'] });

    const resumen = await despacharFilas(pool, [
      FILA,
      { ...FILA, id: 'notif-2', usuarioId: 'usr-2' },
    ]);

    expect(resumen.fallidos).toBe(1);
    // El segundo se mandó igual: un correo caído no arrastra al resto.
    expect(resumen.enviados).toBe(1);
    expect(actualizaciones[0]!.sql).toContain("estado = 'failed'");
    expect(actualizaciones[0]!.parametros[1]).toContain('503');
  });

  it('una entidad que ya no existe no impide mandar el aviso', async () => {
    const enviarCorreo = vi.fn(async () => {});
    vi.doMock('@/lib/correo', () => ({ hayProveedorDeCorreo: () => true, enviarCorreo }));
    const { despacharFilas } = await import('./_despachoDeCorreo');
    const { pool } = mockearPool({ casillasConfirmadas: ['usr-1'], nombres: {} });

    const resumen = await despacharFilas(pool, [FILA]);

    expect(resumen.enviados).toBe(1);
    expect(enviarCorreo).toHaveBeenCalledWith(
      expect.objectContaining({ asunto: 'Te invitaron a un equipo' }),
    );
  });
});
