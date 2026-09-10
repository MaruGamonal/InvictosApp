// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FormularioCrearEquipo } from './FormularioCrearEquipo';

const assign = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  assign.mockClear();
});

function completarCampos(getByLabelText: (texto: RegExp | string) => HTMLElement) {
  fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'Defemi' } });
  fireEvent.change(getByLabelText('Categoría'), { target: { value: 'mixed' } });
}

describe('FormularioCrearEquipo', () => {
  it('sin escudo elegido, crea el equipo y no llama a la ruta de escudo', async () => {
    vi.stubGlobal('location', { assign });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { id: 'eq-nuevo' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole } = render(<FormularioCrearEquipo provincias={[]} />);
    completarCampos(getByLabelText);
    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/equipo/eq-nuevo'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/equipos',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('con escudo elegido, crea el equipo y después sube el escudo con el equipoId nuevo', async () => {
    vi.stubGlobal('location', { assign });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:preview') });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, data: { id: 'eq-nuevo' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, data: { escudoUrl: 'x' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, container } = render(
      <FormularioCrearEquipo provincias={[]} />,
    );
    completarCampos(getByLabelText);

    const archivo = new File(['x'], 'escudo.png', { type: 'image/png' });
    const inputArchivo = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(inputArchivo, { target: { files: [archivo] } });

    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const segundaLlamada = fetchMock.mock.calls[1]!;
    expect(segundaLlamada[0]).toBe('/api/equipos/escudo');
    const datosFormulario = segundaLlamada[1].body as FormData;
    expect(datosFormulario.get('equipoId')).toBe('eq-nuevo');
    expect(datosFormulario.get('archivo')).toBe(archivo);

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/equipo/eq-nuevo'));
  });

  it('si crear el equipo falla, muestra el error y no navega', async () => {
    vi.stubGlobal('location', { assign });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: { mensaje: 'Nombre inválido.' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, getByText } = render(
      <FormularioCrearEquipo provincias={[]} />,
    );
    completarCampos(getByLabelText);
    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(getByText('Nombre inválido.')).toBeTruthy());
    expect(assign).not.toHaveBeenCalled();
  });
});
