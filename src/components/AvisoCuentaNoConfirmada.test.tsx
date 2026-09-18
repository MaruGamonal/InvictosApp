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

  it('si el reenvío falla, muestra un error y deja reintentar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(<AvisoCuentaNoConfirmada mensaje="Aviso." />);
    fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));

    await waitFor(() => expect(getByText('No pudimos reenviarlo. Probá de nuevo.')).toBeTruthy());
    expect(getByRole('button', { name: 'Reenviar enlace' })).not.toBeDisabled();
  });
});
