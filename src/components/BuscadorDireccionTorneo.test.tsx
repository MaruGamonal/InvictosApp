// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BuscadorDireccionTorneo } from './BuscadorDireccionTorneo';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderConLabel(onChange = vi.fn()) {
  const utils = render(
    <>
      <label htmlFor="direccion">Dirección</label>
      <BuscadorDireccionTorneo id="direccion" value="" onChange={onChange} />
    </>,
  );
  return { ...utils, onChange };
}

describe('BuscadorDireccionTorneo', () => {
  it('escribir sin elegir una sugerencia funciona como texto libre, sin coordenadas', () => {
    const { getByLabelText, onChange } = renderConLabel();
    const input = getByLabelText('Dirección') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Cancha 3' } });

    expect(onChange).toHaveBeenCalledWith({
      direccion: 'Cancha 3',
      latitud: null,
      longitud: null,
    });
  });

  it('con menos de 3 caracteres, no busca', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { getByLabelText } = renderConLabel();

    fireEvent.change(getByLabelText('Dirección'), { target: { value: 'Ca' } });
    fireEvent.focus(getByLabelText('Dirección'));

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con 3+ caracteres, busca (con debounce) y lista las sugerencias', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          resultados: [
            {
              direccion: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
              latitud: -32.9468,
              longitud: -60.6393,
            },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText, getByRole } = renderConLabel();
    fireEvent.change(getByLabelText('Dirección'), { target: { value: 'Parque Sarmiento' } });

    await waitFor(() =>
      expect(getByText('Cancha 3, Parque Sarmiento, Rosario, Argentina')).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/geocodificacion/buscar?q=Parque'),
    );
    expect(getByRole('listbox')).toBeTruthy();
  });

  it('elegir una sugerencia llama a onChange con direccion+coordenadas y cierra el panel', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          resultados: [
            {
              direccion: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
              latitud: -32.9468,
              longitud: -60.6393,
            },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText, queryByRole, onChange } = renderConLabel();
    fireEvent.change(getByLabelText('Dirección'), { target: { value: 'Parque Sarmiento' } });
    await waitFor(() =>
      expect(getByText('Cancha 3, Parque Sarmiento, Rosario, Argentina')).toBeTruthy(),
    );
    onChange.mockClear();

    fireEvent.click(getByText('Cancha 3, Parque Sarmiento, Rosario, Argentina'));

    expect(onChange).toHaveBeenCalledWith({
      direccion: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
      latitud: -32.9468,
      longitud: -60.6393,
    });
    expect(queryByRole('listbox')).toBeNull();
  });

  it('si la búsqueda falla, no rompe: muestra "sin resultados" en vez de una sugerencia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { getByLabelText, getByText } = renderConLabel();

    fireEvent.change(getByLabelText('Dirección'), { target: { value: 'Parque Sarmiento' } });

    await waitFor(() =>
      expect(getByText('No encontramos ninguna dirección con ese texto.')).toBeTruthy(),
    );
  });
});
