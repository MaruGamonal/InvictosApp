// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReglasDelTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { FormularioReglasDelTorneo } from './FormularioReglasDelTorneo';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/components/avisos/Avisos', () => ({
  useAvisos: () => ({ cargando: vi.fn(), exito: vi.fn(), error: vi.fn() }),
}));

const REGLAS: ReglasDelTorneo = {
  minJugadoresLista: 5,
  maxJugadoresLista: 20,
  puntosVictoria: 3,
  puntosEmpate: 1,
  puntosDerrota: 0,
  jugadorUnicoPorEquipo: true,
  soloOrganizadorCargaResultados: false,
  partidosPendientesPorAbandono: 'ganados_por_rival',
  golesWalkoverGanador: 3,
  golesWalkoverPerdedor: 0,
  fechaCierreListaBuenaFe: null,
};

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

function montar(hayPartidosJugados = false) {
  return render(
    <FormularioReglasDelTorneo
      torneoId="t-1"
      reglas={REGLAS}
      hayPartidosJugados={hayPartidosJugados}
    />,
  );
}

function cuerpoDe(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0]![1].body);
}

describe('FormularioReglasDelTorneo', () => {
  it('guarda las reglas con los valores de la pantalla', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = montar();
    fireEvent.click(getByLabelText('Los resultados los carga solamente la organización'));
    fireEvent.click(getByText('Guardar reglas'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(cuerpoDe(fetchMock)).toMatchObject({
      torneoId: 't-1',
      soloOrganizadorCargaResultados: true,
      puntosVictoria: 3,
      partidosPendientesPorAbandono: 'ganados_por_rival',
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  /**
   * La tabla se calcula como una diferencia partido por partido, no
   * recorriendo todo de nuevo: cambiar el puntaje a mitad de torneo
   * dejaría una parte sumada con las reglas viejas y otra con las
   * nuevas, y nadie podría auditarla.
   */
  it('con partidos jugados apaga el puntaje y dice por qué', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { getByLabelText, getByText } = montar(true);

    expect((getByLabelText('Puntos por ganar') as HTMLInputElement).disabled).toBe(true);
    expect((getByLabelText('Puntos por empatar') as HTMLInputElement).disabled).toBe(true);
    expect((getByLabelText('Puntos por perder') as HTMLInputElement).disabled).toBe(true);
    expect(getByText(/El puntaje no se cambia con partidos ya jugados/)).toBeTruthy();

    // Lo que sí se puede seguir cambiando.
    expect(
      (getByLabelText('Goles del ganador por presentación') as HTMLInputElement).disabled,
    ).toBe(false);
  });

  /**
   * Y no se manda tampoco: confiar en el `disabled` del navegador sería
   * tratar un detalle de presentación como si fuera la regla.
   */
  it('con partidos jugados, el puntaje ni viaja en el pedido', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = montar(true);
    fireEvent.click(getByText('Guardar reglas'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = cuerpoDe(fetchMock);
    expect(cuerpo).not.toHaveProperty('puntosVictoria');
    expect(cuerpo).not.toHaveProperty('puntosEmpate');
    expect(cuerpo).not.toHaveProperty('puntosDerrota');
    // Lo demás sí.
    expect(cuerpo).toMatchObject({ maxJugadoresLista: 20 });
  });

  /**
   * Los topes de plantel son nullable sin valor por defecto: un torneo
   * nace sin tope. Mandar `Number('')` sería mandar 0, o sea "ningún
   * jugador habilitado".
   */
  it('con los topes de plantel vacíos, no los manda como cero', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = render(
      <FormularioReglasDelTorneo
        torneoId="t-1"
        reglas={{ ...REGLAS, minJugadoresLista: null, maxJugadoresLista: null }}
        hayPartidosJugados={false}
      />,
    );

    expect((getByLabelText(/Mínimo de jugadores/) as HTMLInputElement).value).toBe('');
    fireEvent.click(getByText('Guardar reglas'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = cuerpoDe(fetchMock);
    expect(cuerpo).not.toHaveProperty('minJugadoresLista');
    expect(cuerpo).not.toHaveProperty('maxJugadoresLista');
  });

  it('sin fecha de cierre cargada, no manda el campo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = montar();
    fireEvent.click(getByText('Guardar reglas'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(cuerpoDe(fetchMock)).not.toHaveProperty('fechaCierreListaBuenaFe');
  });

  it('si el servidor rechaza, no refresca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }),
      }),
    );

    const { getByText } = montar();
    fireEvent.click(getByText('Guardar reglas'));

    await waitFor(() => expect(refresh).not.toHaveBeenCalled());
  });
});
