// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AvisoCuentaNoConfirmada } from './AvisoCuentaNoConfirmada';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AvisoCuentaNoConfirmada', () => {
  it('muestra el mensaje recibido y pide reenviar el enlace al tocar el botón', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(
      <AvisoCuentaNoConfirmada mensaje="Confirmá tu cuenta para hacer esto." />,
    );

    expect(getByText('Confirmá tu cuenta para hacer esto.')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));

    await waitFor(() =>
      expect(getByText('Te reenviamos el enlace — revisá tu correo.')).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/reenviar-confirmacion', { method: 'POST' });
  });

  it('si falla de nuestro lado, muestra un error y deja reintentar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(<AvisoCuentaNoConfirmada mensaje="Aviso." />);
    fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));

    await waitFor(() => expect(getByText('No pudimos reenviarlo. Probá de nuevo.')).toBeTruthy());
    expect(getByRole('button', { name: 'Reenviar enlace' })).not.toBeDisabled();
  });

  /**
   * El límite de reenvíos: el servidor explica por qué no se pudo. Antes
   * ese texto se descartaba y quedaba «Probá de nuevo» con el botón al
   * lado, o sea la invitación a repetir lo que acababa de ser rechazado
   * por repetirlo.
   */
  it('si el servidor explica el rechazo, muestra ese motivo y saca el botón', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          ok: false,
          error: {
            codigo: 'DATOS_INVALIDOS',
            mensaje: 'Hay datos que faltan o que no tienen el formato esperado.',
            detalle: [
              { campo: 'email', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
            ],
          },
        }),
      }),
    );

    const { getByRole, getByText, queryByRole, queryByText } = render(
      <AvisoCuentaNoConfirmada mensaje="Aviso." />,
    );
    fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));

    await waitFor(() =>
      expect(getByText('Demasiados intentos. Probá de nuevo más tarde.')).toBeTruthy(),
    );
    expect(queryByText('No pudimos reenviarlo. Probá de nuevo.')).toBeNull();
    expect(queryByRole('button', { name: 'Reenviar enlace' })).toBeNull();
  });
});
