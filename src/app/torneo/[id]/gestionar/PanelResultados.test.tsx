// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelResultados } from './PanelResultados';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const PARTIDO = {
  id: 'p-1',
  numeroFecha: 1,
  equipoLocalId: 'equipo-local',
  equipoLocalNombre: 'Los Pibes',
  equipoVisitanteId: 'equipo-visitante',
  equipoVisitanteNombre: 'Racing del Barrio',
  version: 1,
};

describe('PanelResultados', () => {
  it('sin partidos, muestra el estado vacío', () => {
    const { getByText } = render(<PanelResultados partidos={[]} elegiblesPorEquipo={{}} />);
    expect(getByText('No hay partidos sin resultado.')).toBeTruthy();
  });

  it('sin habilitados en ningún equipo, no ofrece cargar goleadores', () => {
    const { queryByText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );
    expect(queryByText('Goleadores y tarjetas (opcional)')).toBeNull();
  });

  it('carga el marcador solo, sin eventos: no manda el campo eventos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );
    fireEvent.change(getByLabelText('Goles de Los Pibes'), { target: { value: '2' } });
    fireEvent.change(getByLabelText('Goles de Racing del Barrio'), { target: { value: '1' } });
    fireEvent.click(getByText('Cargar'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo).toEqual({ partidoId: 'p-1', version: 1, golesLocal: 2, golesVisitante: 1 });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('atribuye un gol a un jugador habilitado: lo manda en eventos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByLabelText, getByText } = render(
      <PanelResultados
        partidos={[PARTIDO]}
        elegiblesPorEquipo={{
          'equipo-local': [{ perfilId: 'perfil-1', nombreVisible: 'Juan', rolEnTorneo: 'player' }],
        }}
      />,
    );

    fireEvent.change(getByLabelText('Goles de Los Pibes'), { target: { value: '1' } });
    fireEvent.change(getByLabelText('Goles de Racing del Barrio'), { target: { value: '0' } });
    fireEvent.click(getByText('Goleadores y tarjetas (opcional)'));
    fireEvent.click(getByText('+ Agregar gol o tarjeta'));

    // Por default ya queda seleccionado el primer habilitado con tipo "Gol".
    fireEvent.click(getByText('Cargar'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.eventos).toEqual([
      { perfilId: 'perfil-1', equipoId: 'equipo-local', tipoEvento: 'goal' },
    ]);
  });

  it('a un integrante del cuerpo técnico solo se le puede acreditar amarilla o roja, no gol', () => {
    const { getByText, getByLabelText } = render(
      <PanelResultados
        partidos={[PARTIDO]}
        elegiblesPorEquipo={{
          'equipo-local': [{ perfilId: 'perfil-dt', nombreVisible: 'DT Pedro', rolEnTorneo: 'coach' }],
        }}
      />,
    );
    fireEvent.click(getByText('Goleadores y tarjetas (opcional)'));
    fireEvent.click(getByText('+ Agregar gol o tarjeta'));

    const selectTipo = getByLabelText('Tipo de evento') as HTMLSelectElement;
    const opciones = Array.from(selectTipo.options).map((o) => o.value);
    expect(opciones).toEqual(['yellow_card', 'red_card']);
  });
});
