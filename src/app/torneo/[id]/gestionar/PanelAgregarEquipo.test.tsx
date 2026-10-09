// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelAgregarEquipo } from './PanelAgregarEquipo';

const refresh = vi.fn();
const exito = vi.fn();
const error = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/components/avisos/Avisos', () => ({
  useAvisos: () => ({ cargando: vi.fn(), exito, error }),
}));

// `shouldAdvanceTime`: sin esto el `waitFor` de testing-library se
// cuelga, porque espera con temporizadores propios que los falsos
// congelan. El `advanceTimersByTime` sigue haciendo falta para saltear
// el respiro de la búsqueda sin esperarlo de verdad.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  refresh.mockClear();
  exito.mockClear();
  error.mockClear();
  vi.unstubAllGlobals();
});

function respuestaDe(equipos: unknown[]) {
  return { ok: true, json: async () => ({ ok: true, data: { equipos } }) };
}

/** Deja correr el debounce de la búsqueda y las promesas del fetch. */
async function dejarBuscar() {
  await act(async () => {
    vi.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('PanelAgregarEquipo', () => {
  it('con las inscripciones cerradas no se muestra', () => {
    const { container } = render(<PanelAgregarEquipo torneoId="t-1" habilitado={false} />);
    expect(container.firstChild).toBeNull();
  });

  /**
   * El caso que justifica la pantalla: el equipo no está en la
   * aplicación y el organizador lo carga igual.
   */
  it('crea el equipo nuevo y lo inscribe en un paso', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/api/equipos')
        ? respuestaDe([])
        : { ok: true, json: async () => ({ ok: true, data: { advertenciaCategoria: false } }) },
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(<PanelAgregarEquipo torneoId="t-1" habilitado />);
    fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'Las Pumas' } });
    await dejarBuscar();

    fireEvent.click(getByText('Crear «Las Pumas» e inscribirlo'));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/inscripciones/manual',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ torneoId: 't-1', nombre: 'Las Pumas', categoriaGenero: 'mixed' }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  /**
   * Si el equipo ya existe, crear otro con el mismo nombre deja dos: el
   * que juega y el que tiene el plantel y el historial.
   */
  it('ofrece inscribir el que ya existe en vez de duplicarlo', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/api/equipos')
        ? respuestaDe([{ id: 'e-9', nombre: 'Las Pumas', escudoUrl: null, ciudad: 'Posadas' }])
        : { ok: true, json: async () => ({ ok: true, data: { advertenciaCategoria: false } }) },
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(<PanelAgregarEquipo torneoId="t-1" habilitado />);
    fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'Las Pumas' } });
    await dejarBuscar();

    expect(getByText(/conserva su plantel y su historial/)).toBeTruthy();
    fireEvent.click(getByText('Inscribirlo'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/inscripciones/manual',
        expect.objectContaining({ body: JSON.stringify({ torneoId: 't-1', equipoId: 'e-9' }) }),
      ),
    );
  });

  /** Una tecla no es una búsqueda: el debounce evita un pedido por letra. */
  it('no busca con menos de dos letras', async () => {
    const fetchMock = vi.fn(async () => respuestaDe([]));
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText } = render(<PanelAgregarEquipo torneoId="t-1" habilitado />);
    fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'L' } });
    await dejarBuscar();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * La categoría distinta no frena nada (`06`, D-82) — el organizador ya
   * decidió— pero tiene que enterarse.
   */
  it('avisa cuando el equipo queda con una categoría distinta a la del torneo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.startsWith('/api/equipos')
          ? respuestaDe([])
          : { ok: true, json: async () => ({ ok: true, data: { advertenciaCategoria: true } }) },
      ),
    );

    const { getByLabelText, getByText } = render(<PanelAgregarEquipo torneoId="t-1" habilitado />);
    fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'Las Pumas' } });
    await dejarBuscar();
    fireEvent.click(getByText('Crear «Las Pumas» e inscribirlo'));

    await waitFor(() =>
      expect(exito).toHaveBeenCalledWith(expect.stringContaining('categoría distinta'), undefined),
    );
  });

  it('si el servidor rechaza, lo dice y no refresca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.startsWith('/api/equipos')
          ? respuestaDe([])
          : {
              ok: false,
              status: 409,
              json: async () => ({
                ok: false,
                error: { mensaje: 'Este torneo ya completó su cupo de equipos.' },
              }),
            },
      ),
    );

    const { getByLabelText, getByText } = render(<PanelAgregarEquipo torneoId="t-1" habilitado />);
    fireEvent.change(getByLabelText('Nombre del equipo'), { target: { value: 'Las Pumas' } });
    await dejarBuscar();
    fireEvent.click(getByText('Crear «Las Pumas» e inscribirlo'));

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Este torneo ya completó su cupo de equipos.', undefined),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
