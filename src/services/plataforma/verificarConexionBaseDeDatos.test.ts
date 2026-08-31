import { describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

vi.mock('@/db/cliente', () => ({
  obtenerPool: () => ({ query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) }),
}));

describe('verificarConexionBaseDeDatos', () => {
  it('recibe (input, contexto) y devuelve si la conexión funciona, sin objetos HTTP', async () => {
    const { verificarConexionBaseDeDatos } = await import('./verificarConexionBaseDeDatos');
    const contexto: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

    const resultado = await verificarConexionBaseDeDatos(undefined, contexto);

    expect(resultado).toEqual({ conectado: true });
  });
});
