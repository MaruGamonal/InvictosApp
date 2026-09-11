// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelPublicarInicial } from './PanelPublicarInicial';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('PanelPublicarInicial', () => {
  it('al publicar, llama a la API y navega a la gestión del torneo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<PanelPublicarInicial torneoId="t-1" />);
    fireEvent.click(getByText('Publicar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/publicar',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ torneoId: 't-1' }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/torneo/t-1/gestionar'));
  });

  it('si publicar falla, muestra el error y no navega', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<PanelPublicarInicial torneoId="t-1" />);
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
