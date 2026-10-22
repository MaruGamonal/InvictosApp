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

  it('sin jugadores elegibles en ningún equipo, no ofrece elegir jugador del partido', () => {
    const { queryByLabelText } = render(
      <PanelResultados
        partidos={[PARTIDO]}
        elegiblesPorEquipo={{
          'equipo-local': [
            { perfilId: 'perfil-dt', nombreVisible: 'DT Pedro', rolEnTorneo: 'coach' },
          ],
        }}
      />,
    );
    expect(queryByLabelText('Jugador del partido')).toBeNull();
  });

  it('elige un jugador del partido y lo manda al cargar; sin elegir, no manda el campo', async () => {
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
    fireEvent.click(getByText('Cargar'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    let cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.jugadorDelPartidoPerfilId).toBeUndefined();

    fetchMock.mockClear();
    fireEvent.change(getByLabelText('Jugador del partido'), { target: { value: 'perfil-1' } });
    fireEvent.click(getByText('Cargar'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.jugadorDelPartidoPerfilId).toBe('perfil-1');
  });

  it('a un integrante del cuerpo técnico solo se le puede acreditar amarilla o roja, no gol', () => {
    const { getByText, getByLabelText } = render(
      <PanelResultados
        partidos={[PARTIDO]}
        elegiblesPorEquipo={{
          'equipo-local': [
            { perfilId: 'perfil-dt', nombreVisible: 'DT Pedro', rolEnTorneo: 'coach' },
          ],
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

/**
 * UC-33 — Un partido que no se jugó. El servicio existía desde el
 * principio y no tenía ni ruta ni pantalla: no había forma de registrar
 * que un equipo no se presentó, que es algo semanal en un torneo
 * amateur.
 */
describe('PanelResultados: partido no disputado', () => {
  it('no muestra el formulario hasta que se pide: lo habitual es que se haya jugado', () => {
    const { getByText, queryByLabelText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );

    expect(getByText('No se jugó')).toBeTruthy();
    expect(queryByLabelText('Motivo')).toBeNull();
  });

  it('suspende un partido: manda la resolución y el motivo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { getByText, getByLabelText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );

    fireEvent.click(getByText('No se jugó'));
    fireEvent.change(getByLabelText('Motivo'), { target: { value: 'Se inundó la cancha' } });
    fireEvent.click(getByText('Guardar'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/partidos/no-disputado');
    expect(JSON.parse(opciones.body)).toEqual({
      partidoId: 'p-1',
      resolucion: 'postponed',
      motivo: 'Se inundó la cancha',
    });
  });

  /** Una presentación necesita saber quién ganó; una suspensión, no. */
  it('ganado por presentación: pide el equipo y no deja guardar sin elegirlo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { getByText, getByLabelText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );

    fireEvent.click(getByText('No se jugó'));
    fireEvent.change(getByLabelText('Qué pasó con Los Pibes vs Racing del Barrio'), {
      target: { value: 'walkover' },
    });

    const guardar = getByText('Guardar') as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    fireEvent.change(getByLabelText('Equipo ganador por presentación'), {
      target: { value: 'equipo-visitante' },
    });
    expect(guardar.disabled).toBe(false);

    fireEvent.click(guardar);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      partidoId: 'p-1',
      resolucion: 'walkover',
      equipoGanadorId: 'equipo-visitante',
    });
  });

  it('cambiar de resolución limpia el ganador elegido antes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { getByText, getByLabelText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );

    fireEvent.click(getByText('No se jugó'));
    const queMePaso = getByLabelText('Qué pasó con Los Pibes vs Racing del Barrio');
    fireEvent.change(queMePaso, { target: { value: 'walkover' } });
    fireEvent.change(getByLabelText('Equipo ganador por presentación'), {
      target: { value: 'equipo-local' },
    });
    fireEvent.change(queMePaso, { target: { value: 'cancelled' } });

    fireEvent.click(getByText('Guardar'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Sin `equipoGanadorId` colgado de la elección anterior: el
    // servicio lo rechaza para todo lo que no sea walkover.
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      partidoId: 'p-1',
      resolucion: 'cancelled',
    });
  });

  it('cancelar cierra el formulario sin mandar nada', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { getByText, queryByLabelText } = render(
      <PanelResultados partidos={[PARTIDO]} elegiblesPorEquipo={{}} />,
    );

    fireEvent.click(getByText('No se jugó'));
    fireEvent.click(getByText('Cancelar'));

    expect(queryByLabelText('Motivo')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('PanelResultados: la suma de goles (UC-34)', () => {
  /**
   * UC-34: avisar **sin bloquear**. La mitad que importa es la segunda
   * — cargar la planilla es opcional, y un formulario que se traba
   * hasta que cuadre empuja a no cargar ningún goleador.
   */
  describe('cuando los goles cargados no dan el marcador', () => {
    function montarConUnGolDeTres() {
      const resultado = render(
        <PanelResultados
          partidos={[PARTIDO]}
          elegiblesPorEquipo={{
            'equipo-local': [
              { perfilId: 'perfil-1', nombreVisible: 'Juan', rolEnTorneo: 'player' },
            ],
          }}
        />,
      );
      fireEvent.change(resultado.getByLabelText('Goles de Los Pibes'), {
        target: { value: '3' },
      });
      fireEvent.change(resultado.getByLabelText('Goles de Racing del Barrio'), {
        target: { value: '0' },
      });
      fireEvent.click(resultado.getByText('Goleadores y tarjetas (opcional)'));
      fireEvent.click(resultado.getByText('+ Agregar gol o tarjeta'));
      return resultado;
    }

    it('avisa, nombrando el equipo y las dos cuentas', () => {
      const { getByRole } = montarConUnGolDeTres();
      expect(getByRole('status').textContent).toContain(
        'Los Pibes: 3 en el marcador y 1 atribuido',
      );
    });

    it('no bloquea: el botón de cargar sigue habilitado y manda igual', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
      vi.stubGlobal('fetch', fetchMock);

      const { getByText } = montarConUnGolDeTres();
      const boton = getByText('Cargar') as HTMLButtonElement;
      expect(boton.disabled).toBe(false);

      fireEvent.click(boton);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
      expect(cuerpo.golesLocal).toBe(3);
      expect(cuerpo.eventos).toHaveLength(1);
    });

    it('al completar la planilla el aviso se va', () => {
      const { getByText, queryByRole } = montarConUnGolDeTres();
      fireEvent.click(getByText('+ Agregar gol o tarjeta'));
      fireEvent.click(getByText('+ Agregar gol o tarjeta'));
      expect(queryByRole('status')).toBeNull();
    });
  });

  it('sin cargar ningún gol no avisa nada: la planilla es opcional', () => {
    const { getByLabelText, queryByRole } = render(
      <PanelResultados
        partidos={[PARTIDO]}
        elegiblesPorEquipo={{
          'equipo-local': [{ perfilId: 'perfil-1', nombreVisible: 'Juan', rolEnTorneo: 'player' }],
        }}
      />,
    );
    fireEvent.change(getByLabelText('Goles de Los Pibes'), { target: { value: '3' } });
    fireEvent.change(getByLabelText('Goles de Racing del Barrio'), { target: { value: '0' } });
    expect(queryByRole('status')).toBeNull();
  });
});
