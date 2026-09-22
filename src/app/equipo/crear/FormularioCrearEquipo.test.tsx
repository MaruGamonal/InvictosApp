// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FormularioCrearEquipo } from './FormularioCrearEquipo';
import { ProveedorAvisos } from '@/components/avisos/Avisos';

const assign = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  assign.mockClear();
});

function completarCampos(
  getByLabelText: (texto: RegExp | string) => HTMLElement,
  getByRole: (rol: string, opciones: { name: string }) => HTMLElement,
) {
  fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'Defemi' } });
  fireEvent.click(getByRole('radio', { name: 'Mixto' }));
}

describe('FormularioCrearEquipo', () => {
  it('sin nombre ni categoría, "Crear equipo" queda deshabilitado', () => {
    const { getByRole } = render(<FormularioCrearEquipo provincias={[]} />);
    expect(getByRole('button', { name: 'Crear equipo' })).toBeDisabled();
  });

  it('sin escudo elegido, crea el equipo y no llama a la ruta de escudo', async () => {
    vi.stubGlobal('location', { assign });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { id: 'eq-nuevo' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole } = render(<FormularioCrearEquipo provincias={[]} />);
    completarCampos(getByLabelText, getByRole);
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
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { id: 'eq-nuevo' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { escudoUrl: 'x' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, container } = render(
      <FormularioCrearEquipo provincias={[]} />,
    );
    completarCampos(getByLabelText, getByRole);

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
    completarCampos(getByLabelText, getByRole);
    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(getByText('Nombre inválido.')).toBeTruthy());
    expect(assign).not.toHaveBeenCalled();
  });

  /**
   * Antes el aviso se insertaba entre los campos y movía de lugar todo
   * lo que venía después, con el formulario ya completo. Ahora sale por
   * el aviso y el formulario queda como estaba.
   */
  it('con la cuenta sin confirmar avisa sin meter un bloque en el formulario', async () => {
    vi.stubGlobal('location', { assign });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: { codigo: 'CUENTA_NO_CONFIRMADA', mensaje: 'Confirmá tu cuenta para hacer esto.' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, getByText, container } = render(
      <ProveedorAvisos>
        <FormularioCrearEquipo provincias={[]} />
      </ProveedorAvisos>,
    );
    completarCampos(getByLabelText, getByRole);
    const camposAntes = container.querySelectorAll('form .campo, form label').length;
    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(getByText(/Confirmá tu cuenta/)).toBeTruthy());
    expect(getByRole('button', { name: 'Reenviar email' })).toBeTruthy();
    // El formulario no cambió: ni un nodo más adentro.
    expect(container.querySelectorAll('form .campo, form label')).toHaveLength(camposAntes);
    expect(getByRole('button', { name: 'Crear equipo' })).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  /**
   * Reportado en vivo: "la carga de imágenes falla y después no se ven
   * en el perfil". La subida del escudo iba con un `fetch` pelado, que
   * no lanza con un 4xx/5xx, así que el rechazo del servidor no se veía
   * en ningún lado y la pantalla navegaba igual.
   */
  it('si el escudo se rechaza, lo dice, no navega solo y ofrece entrar al equipo ya creado', async () => {
    vi.stubGlobal('location', { assign });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:preview') });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { id: 'eq-nuevo' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: { mensaje: 'No pudimos guardar la imagen.' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, getByText, container } = render(
      <FormularioCrearEquipo provincias={[]} />,
    );
    completarCampos(getByLabelText, getByRole);

    const archivo = new File(['x'], 'escudo.png', { type: 'image/png' });
    const inputArchivo = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(inputArchivo, { target: { files: [archivo] } });
    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(getByText('No pudimos guardar la imagen.')).toBeTruthy());
    expect(getByText('Equipo creado')).toBeTruthy();
    expect(getByRole('link', { name: 'Ir al equipo' })).toHaveProperty(
      'href',
      expect.stringContaining('/equipo/eq-nuevo'),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('si la conexión se cae subiendo el escudo, tampoco navega en silencio', async () => {
    vi.stubGlobal('location', { assign });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:preview') });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { id: 'eq-nuevo' } }),
      })
      .mockRejectedValueOnce(new Error('sin red'));
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByRole, getByText, container } = render(
      <FormularioCrearEquipo provincias={[]} />,
    );
    completarCampos(getByLabelText, getByRole);

    const archivo = new File(['x'], 'escudo.png', { type: 'image/png' });
    const inputArchivo = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(inputArchivo, { target: { files: [archivo] } });
    fireEvent.click(getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => expect(getByText('No pudimos conectar. Probá de nuevo.')).toBeTruthy());
    expect(assign).not.toHaveBeenCalled();
  });
});
