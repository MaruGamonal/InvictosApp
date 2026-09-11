// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FormularioReglamentoInicial } from './FormularioReglamentoInicial';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('FormularioReglamentoInicial', () => {
  it('sin texto ni archivo, "Continuar a publicar" queda deshabilitado', () => {
    const { getByText } = render(<FormularioReglamentoInicial torneoId="t-1" />);
    expect(getByText('Continuar a publicar')).toBeDisabled();
  });

  it('"Omitir" navega al paso de publicar sin llamar a la API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(<FormularioReglamentoInicial torneoId="t-1" />);
    fireEvent.click(getByText('Omitir — es opcional'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/torneo/t-1/crear/publicar');
  });

  it('con texto, continuar publica el reglamento y navega al paso de publicar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByPlaceholderText } = render(
      <FormularioReglamentoInicial torneoId="t-1" />,
    );
    fireEvent.change(getByPlaceholderText('Escribí el reglamento, o subí un archivo abajo'), {
      target: { value: 'No se admiten reclamos después de las 48hs.' },
    });
    fireEvent.click(getByText('Continuar a publicar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/publicar-reglamento',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            torneoId: 't-1',
            texto: 'No se admiten reclamos después de las 48hs.',
            archivoUrl: undefined,
          }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/torneo/t-1/crear/publicar'));
  });

  it('al elegir un archivo, lo sube y muestra el nombre', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { archivoUrl: 'https://cdn/x.pdf' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, container } = render(<FormularioReglamentoInicial torneoId="t-1" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const archivo = new File(['x'], 'reglamento.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [archivo] } });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/reglamento-archivo',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(getByText(/reglamento\.pdf/)).toBeTruthy());
    expect(getByText('Continuar a publicar')).not.toBeDisabled();
  });

  it('si publicar el reglamento falla, muestra el error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByPlaceholderText } = render(
      <FormularioReglamentoInicial torneoId="t-1" />,
    );
    fireEvent.change(getByPlaceholderText('Escribí el reglamento, o subí un archivo abajo'), {
      target: { value: 'Texto' },
    });
    fireEvent.click(getByText('Continuar a publicar'));

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});
