// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelListaDeBuenaFe } from './PanelListaDeBuenaFe';
import type { IntegranteListaDeBuenaFe } from '@/services/inscripciones/obtenerListaDeBuenaFe';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const INTEGRANTES: IntegranteListaDeBuenaFe[] = [
  {
    perfilId: 'p-1',
    nombreVisible: 'Bruno Sosa',
    rolesEquipo: ['captain', 'player'],
    rolHabilitado: null,
    numeroCamiseta: null,
    yaHabilitadoEnOtroEquipo: false,
  },
  {
    perfilId: 'p-2',
    nombreVisible: 'Leo Ferrari',
    rolesEquipo: ['player'],
    rolHabilitado: null,
    numeroCamiseta: null,
    yaHabilitadoEnOtroEquipo: true,
  },
];

describe('PanelListaDeBuenaFe', () => {
  it('marca disabled y con aviso a quien ya está habilitado en otro equipo, y cuenta solo a los jugadores elegibles', () => {
    const { getByText } = render(
      <PanelListaDeBuenaFe
        torneoId="t-1"
        equipoId="eq-1"
        integrantes={INTEGRANTES}
        minJugadores={7}
        maxJugadores={15}
        cerrada={false}
      />,
    );
    expect(getByText('Ya habilitado en otro equipo')).toBeTruthy();
    expect(getByText('1 habilitados')).toBeTruthy();
    expect(getByText('máx. 15')).toBeTruthy();
  });

  it('al confirmar, envía solo a los seleccionados con el rol inferido', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { advertenciaMinimoNoAlcanzado: false, pendientes: [] } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelListaDeBuenaFe
        torneoId="t-1"
        equipoId="eq-1"
        integrantes={INTEGRANTES}
        minJugadores={7}
        maxJugadores={15}
        cerrada={false}
      />,
    );
    fireEvent.click(getByText('Confirmar lista'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/inscripciones/confirmar-plantel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            torneoId: 't-1',
            equipoId: 'eq-1',
            integrantes: [{ perfilId: 'p-1', rolEnTorneo: 'player' }],
          }),
        }),
      ),
    );
    await waitFor(() => expect(getByText('Lista confirmada.')).toBeTruthy());
  });

  it('con el torneo cerrado a incorporaciones, no muestra el formulario', () => {
    const { getByText, queryByText } = render(
      <PanelListaDeBuenaFe
        torneoId="t-1"
        equipoId="eq-1"
        integrantes={INTEGRANTES}
        minJugadores={7}
        maxJugadores={15}
        cerrada
      />,
    );
    expect(
      getByText('Este torneo ya cerró las incorporaciones a la lista de buena fe.'),
    ).toBeTruthy();
    expect(queryByText('Confirmar lista')).toBeNull();
  });

  it('si la API falla, muestra el error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelListaDeBuenaFe
        torneoId="t-1"
        equipoId="eq-1"
        integrantes={INTEGRANTES}
        minJugadores={7}
        maxJugadores={15}
        cerrada={false}
      />,
    );
    fireEvent.click(getByText('Confirmar lista'));
    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
  });
});
