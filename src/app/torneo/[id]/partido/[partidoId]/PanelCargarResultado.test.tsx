// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelCargarResultado } from './PanelCargarResultado';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

function montar() {
  return render(
    <PanelCargarResultado
      partidoId="p-1"
      version={3}
      localNombre="Defemi Bordo"
      visitanteNombre="Las Pumas"
    />,
  );
}

describe('PanelCargarResultado', () => {
  it('no deja cargar hasta que estén los dos marcadores', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = montar();
    const boton = getByText('Cargar resultado') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    // Un solo marcador no alcanza: 2-nada no es un resultado.
    fireEvent.change(getByLabelText('Goles de Defemi Bordo'), { target: { value: '2' } });
    expect(boton.disabled).toBe(true);

    fireEvent.change(getByLabelText('Goles de Las Pumas'), { target: { value: '1' } });
    expect(boton.disabled).toBe(false);
  });

  /** Un 0-0 es un resultado: el cero no puede contar como "sin cargar". */
  it('acepta el cero', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { getByText, getByLabelText } = montar();
    fireEvent.change(getByLabelText('Goles de Defemi Bordo'), { target: { value: '0' } });
    fireEvent.change(getByLabelText('Goles de Las Pumas'), { target: { value: '0' } });
    expect((getByText('Cargar resultado') as HTMLButtonElement).disabled).toBe(false);
  });

  it('manda el marcador con la versión del partido y refresca', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = montar();
    fireEvent.change(getByLabelText('Goles de Defemi Bordo'), { target: { value: '2' } });
    fireEvent.change(getByLabelText('Goles de Las Pumas'), { target: { value: '1' } });
    fireEvent.click(getByText('Cargar resultado'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/partidos/cargar-resultado',
        expect.objectContaining({
          method: 'POST',
          // Los goles van como números, y la versión es lo que hace que
          // dos cargas simultáneas no se pisen en silencio.
          body: JSON.stringify({
            partidoId: 'p-1',
            version: 3,
            golesLocal: 2,
            golesVisitante: 1,
          }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  /**
   * `fetch` no lanza con 4xx ni 5xx: sin mirar `ok`, un rechazo del
   * servidor se vería como un resultado cargado.
   */
  it('si el servidor rechaza, muestra su motivo y no refresca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          ok: false,
          error: {
            codigo: 'SOLO_ORGANIZADOR_CARGA_RESULTADOS',
            mensaje: 'En este torneo los resultados los carga solamente la organización.',
          },
        }),
      }),
    );

    const { getByText, getByLabelText } = montar();
    fireEvent.change(getByLabelText('Goles de Defemi Bordo'), { target: { value: '1' } });
    fireEvent.change(getByLabelText('Goles de Las Pumas'), { target: { value: '0' } });
    fireEvent.click(getByText('Cargar resultado'));

    await waitFor(() =>
      expect(
        getByText('En este torneo los resultados los carga solamente la organización.'),
      ).toBeTruthy(),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
