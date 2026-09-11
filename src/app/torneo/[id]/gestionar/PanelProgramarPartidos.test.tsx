// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelProgramarPartidos } from './PanelProgramarPartidos';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const PARTIDO_SIN_PROGRAMAR = {
  id: 'p-1',
  numeroFecha: 1,
  equipoLocalNombre: 'Los Pibes',
  equipoVisitanteNombre: 'Racing del Barrio',
  estado: 'unscheduled',
  fechaHoraProgramada: null,
  sedeNombre: null,
};

describe('PanelProgramarPartidos', () => {
  it('sin partidos, muestra el estado vacío', () => {
    const { getByText } = render(<PanelProgramarPartidos partidos={[]} ciudadId="ciudad-1" />);
    expect(getByText('Todavía no hay partidos generados.')).toBeTruthy();
  });

  it('un partido ya jugado no muestra acción de programar', () => {
    const { queryByText } = render(
      <PanelProgramarPartidos
        partidos={[{ ...PARTIDO_SIN_PROGRAMAR, estado: 'played' }]}
        ciudadId="ciudad-1"
      />,
    );
    expect(queryByText('Programar')).toBeNull();
  });

  it('al programar sin sede, envía fechaHoraProgramada sin sedeNueva', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, container } = render(
      <PanelProgramarPartidos partidos={[PARTIDO_SIN_PROGRAMAR]} ciudadId="ciudad-1" />,
    );
    fireEvent.click(getByText('Programar'));

    const inputFecha = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(inputFecha, { target: { value: '2026-05-01T18:00' } });
    fireEvent.click(getByText('Guardar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/fixture/programar-partido',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.partidoId).toBe('p-1');
    expect(cuerpo.sedeNueva).toBeUndefined();
    expect(new Date(cuerpo.fechaHoraProgramada).getTime()).toBe(
      new Date('2026-05-01T18:00').getTime(),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('al programar con sede completa, envía sedeNueva con la ciudad del torneo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByPlaceholderText, container } = render(
      <PanelProgramarPartidos partidos={[PARTIDO_SIN_PROGRAMAR]} ciudadId="ciudad-1" />,
    );
    fireEvent.click(getByText('Programar'));

    const inputFecha = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(inputFecha, { target: { value: '2026-05-01T18:00' } });
    fireEvent.change(getByPlaceholderText('Sede (opcional)'), { target: { value: 'Cancha 3' } });
    fireEvent.change(getByPlaceholderText('Dirección'), { target: { value: 'Av. Siempreviva 742' } });
    fireEvent.click(getByText('Guardar'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.sedeNueva).toEqual({
      nombre: 'Cancha 3',
      direccion: 'Av. Siempreviva 742',
      ciudadId: 'ciudad-1',
    });
  });

  it('con solo uno de los dos campos de sede completo, muestra un error y no llama a la API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByPlaceholderText, container } = render(
      <PanelProgramarPartidos partidos={[PARTIDO_SIN_PROGRAMAR]} ciudadId="ciudad-1" />,
    );
    fireEvent.click(getByText('Programar'));

    const inputFecha = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(inputFecha, { target: { value: '2026-05-01T18:00' } });
    fireEvent.change(getByPlaceholderText('Sede (opcional)'), { target: { value: 'Cancha 3' } });
    fireEvent.click(getByText('Guardar'));

    await waitFor(() =>
      expect(
        getByText('Para agregar una sede hacen falta el nombre y la dirección, los dos.'),
      ).toBeTruthy(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
