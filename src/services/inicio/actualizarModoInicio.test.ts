import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const USUARIO: Contexto = {
  usuarioId: '11111111-1111-1111-1111-111111111111',
  permisos: {},
  esSistema: false,
};
const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const cookieSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
}));

beforeEach(() => cookieSet.mockClear());

describe('actualizarModoInicio', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    const { actualizarModoInicio } = await import('./actualizarModoInicio');
    await expect(actualizarModoInicio({ modo: 'organizador' }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it('guarda el modo elegido en la cookie', async () => {
    const { actualizarModoInicio } = await import('./actualizarModoInicio');
    const resultado = await actualizarModoInicio({ modo: 'organizador' }, USUARIO);

    expect(resultado).toEqual({ modo: 'organizador' });
    expect(cookieSet).toHaveBeenCalledWith(
      'modo_inicio',
      'organizador',
      expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('un modo inválido se rechaza con DATOS_INVALIDOS', async () => {
    const { actualizarModoInicio } = await import('./actualizarModoInicio');
    await expect(
      actualizarModoInicio({ modo: 'lo-que-sea' } as never, USUARIO),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
