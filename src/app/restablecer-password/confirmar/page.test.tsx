// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import PaginaConfirmarRecuperacion from './page';

afterEach(cleanup);

/**
 * Esta pantalla existía desde que se construyó el canje por token, pero
 * no se alcanzaba: `solicitarRecuperacionPassword` seguía mandando al
 * canje por código. Ahora es el destino real del enlace de
 * recuperación, así que conviene que tenga pruebas.
 */
describe('la pantalla que confirma el enlace de recuperación', () => {
  it('muestra el botón, con el token y el tipo listos para el POST', async () => {
    const { getByRole, container } = render(
      await PaginaConfirmarRecuperacion({
        searchParams: Promise.resolve({ token_hash: 'abc123', type: 'recovery' }),
      }),
    );

    // Es POST a propósito: un GET lo dispara cualquier escáner de correo
    // y gastaría el token antes de que la persona llegue.
    const formulario = container.querySelector('form')!;
    expect(formulario.getAttribute('method')?.toLowerCase()).toBe('post');
    expect(formulario.getAttribute('action')).toBe('/api/restablecer-password/confirmar');
    expect(getByRole('button', { name: 'Continuar' })).toBeTruthy();

    const campos = Object.fromEntries(
      [...container.querySelectorAll('input[type="hidden"]')].map((campo) => [
        campo.getAttribute('name'),
        campo.getAttribute('value'),
      ]),
    );
    expect(campos).toEqual({ token_hash: 'abc123', type: 'recovery' });
  });

  /** Sin `type` cae a `recovery`, que es el único que manda este flujo. */
  it('sin tipo asume recovery', async () => {
    const { container } = render(
      await PaginaConfirmarRecuperacion({
        searchParams: Promise.resolve({ token_hash: 'abc123' }),
      }),
    );

    expect(container.querySelector('input[name="type"]')?.getAttribute('value')).toBe('recovery');
  });

  /**
   * El caso que va a aparecer si la plantilla de Supabase todavía no
   * está cambiada: el enlace llega con `?code=` y sin `token_hash`.
   */
  it('sin token avisa que el enlace está incompleto, y no ofrece botón', async () => {
    const { getByText, queryByRole } = render(
      await PaginaConfirmarRecuperacion({ searchParams: Promise.resolve({}) }),
    );

    expect(getByText('El enlace está incompleto')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });
});
