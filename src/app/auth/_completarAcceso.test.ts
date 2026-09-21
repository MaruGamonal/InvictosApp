import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';

const completarRegistro = vi.fn();
const confirmarEmailCuenta = vi.fn();
const confirmarVerificacionBasica = vi.fn();

vi.mock('@/lib/contexto', () => ({ construirContexto: async () => ({ usuarioId: 'u1' }) }));
vi.mock('@/services/identidad/completarRegistro', () => ({ completarRegistro }));
vi.mock('@/services/identidad/confirmarEmailCuenta', () => ({ confirmarEmailCuenta }));
vi.mock('@/services/organizadores/confirmarVerificacionBasica', () => ({
  confirmarVerificacionBasica,
}));

const { completarAcceso, leerIntencion } = await import('./_completarAcceso');

const usuario = (metadata: Record<string, unknown> = {}) =>
  ({ id: 'u1', email: 'alguien@example.com', user_metadata: metadata }) as unknown as User;

const ORG = '11111111-1111-1111-1111-111111111111';

describe('completarAcceso', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * El bug que motivó el cambio: `signInWithOtp` aplica `options.data`
   * solo cuando crea la cuenta, y estos enlaces salen con
   * `shouldCreateUser: false` sobre cuentas que ya existen. La marca
   * `accion: 'confirmar_cuenta'` no llegaba nunca, así que la persona
   * volvía del correo y la aplicación le seguía pidiendo confirmar.
   */
  it('confirma la cuenta aunque el enlace no traiga ninguna marca', async () => {
    await completarAcceso(usuario());
    expect(confirmarEmailCuenta).toHaveBeenCalledWith({ usuarioId: 'u1' }, expect.anything());
  });

  it('confirma la cuenta también cuando el enlace era para verificar la organización', async () => {
    await completarAcceso(usuario(), { organizacionId: ORG });
    expect(confirmarEmailCuenta).toHaveBeenCalled();
    expect(confirmarVerificacionBasica).toHaveBeenCalledWith(
      { organizacionId: ORG },
      expect.anything(),
    );
  });

  it('crea la cuenta antes de confirmarla, para que un alta no confirme una fila inexistente', async () => {
    const orden: string[] = [];
    completarRegistro.mockImplementation(async () => void orden.push('registro'));
    confirmarEmailCuenta.mockImplementation(async () => void orden.push('confirmacion'));

    await completarAcceso(usuario());
    expect(orden).toEqual(['registro', 'confirmacion']);
  });

  /** Los enlaces que ya habían salido antes del cambio. */
  it('sigue entendiendo la organización que venía en la metadata', async () => {
    await completarAcceso(usuario({ accion: 'verificar_organizacion', organizacion_id: ORG }));
    expect(confirmarVerificacionBasica).toHaveBeenCalledWith(
      { organizacionId: ORG },
      expect.anything(),
    );
  });

  it('no verifica ninguna organización cuando el enlace no menciona una', async () => {
    await completarAcceso(usuario());
    expect(confirmarVerificacionBasica).not.toHaveBeenCalled();
  });
});

describe('leerIntencion', () => {
  it('lee la organización de la ruta', () => {
    expect(leerIntencion(['organizacion', ORG])).toEqual({ organizacionId: ORG });
  });

  it('ignora una ruta que no reconoce', () => {
    expect(leerIntencion(['cualquier', 'cosa'])).toEqual({});
    expect(leerIntencion(undefined)).toEqual({});
  });
});
