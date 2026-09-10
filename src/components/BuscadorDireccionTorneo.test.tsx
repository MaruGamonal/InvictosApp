// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BuscadorDireccionTorneo } from './BuscadorDireccionTorneo';

describe('BuscadorDireccionTorneo', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    // @ts-expect-error -- se limpia entre tests
    delete window.google;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('sin API key, funciona como input de texto libre: cada tecleo llega al padre', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <>
        <label htmlFor="direccion">Dirección</label>
        <BuscadorDireccionTorneo id="direccion" value="" onChange={onChange} />
      </>,
    );

    const input = getByLabelText('Dirección') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Cancha 3' } });

    expect(onChange).toHaveBeenCalledWith({
      direccion: 'Cancha 3',
      latitud: null,
      longitud: null,
    });
  });

  it('con Places disponible, solo actualiza al elegir una sugerencia real (con coordenadas)', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'una-key-de-prueba');

    let callbackPlaceChanged: (() => void) | undefined;
    const getPlace = vi.fn().mockReturnValue({
      formatted_address: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
      geometry: { location: { lat: () => -32.9468, lng: () => -60.6393 } },
    });
    const addListener = vi.fn((evento: string, callback: () => void) => {
      if (evento === 'place_changed') callbackPlaceChanged = callback;
    });
    const AutocompleteMock = vi.fn().mockImplementation(() => ({ addListener, getPlace }));

    // @ts-expect-error -- stub mínimo para el test
    window.google = { maps: { places: { Autocomplete: AutocompleteMock } } };

    const onChange = vi.fn();
    const { getByLabelText } = render(
      <>
        <label htmlFor="direccion">Dirección</label>
        <BuscadorDireccionTorneo id="direccion" value="" onChange={onChange} />
      </>,
    );

    await waitFor(() => expect(AutocompleteMock).toHaveBeenCalled());

    const input = getByLabelText('Dirección') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'texto sin elegir de la lista' } });
    expect(onChange).not.toHaveBeenCalled();

    callbackPlaceChanged?.();

    expect(onChange).toHaveBeenCalledWith({
      direccion: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
      latitud: -32.9468,
      longitud: -60.6393,
    });
  });
});
