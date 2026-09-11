// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FilaIntegranteGestion } from './FilaIntegranteGestion';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

describe('FilaIntegranteGestion', () => {
  it('sobre uno mismo (no capitán), muestra la × para dejar el equipo', () => {
    const { getByTitle, queryByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-1"
        nombreVisible="Ana"
        fotoUrl={null}
        rolesEquipo={['player']}
        esUnoMismo
        esCapitanViewer={false}
      />,
    );
    expect(getByTitle('Dejar el equipo')).toBeTruthy();
    expect(queryByText('Quitar del plantel')).toBeNull();
  });

  it('sobre uno mismo siendo capitán, no muestra × (no puede irse sin reemplazo)', () => {
    const { queryByTitle } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-1"
        nombreVisible="Ana"
        fotoUrl={null}
        rolesEquipo={['captain']}
        esUnoMismo
        esCapitanViewer
      />,
    );
    expect(queryByTitle('Dejar el equipo')).toBeNull();
  });

  it('sin ser capitán, sobre otro integrante no muestra acciones de gestión', () => {
    const { queryByText, queryByTitle } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        fotoUrl={null}
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer={false}
      />,
    );
    expect(queryByTitle('Quitar a Bruno del plantel')).toBeNull();
    expect(queryByText('Más opciones')).toBeNull();
  });

  it('el capitán ve la × rápida y, en "Más opciones", los roles designables', () => {
    const { getByText, getByTitle, queryByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        fotoUrl={null}
        rolesEquipo={['player', 'delegate']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    expect(getByTitle('Quitar a Bruno del plantel')).toBeTruthy();
    expect(queryByText('Hacer capitán')).toBeNull();

    fireEvent.click(getByText('Más opciones'));
    expect(getByText('Hacer capitán')).toBeTruthy();
    expect(getByText('Hacer DT')).toBeTruthy();
    expect(getByText('Quitar como delegado')).toBeTruthy();
    expect(queryByText('Quitar del plantel')).toBeNull();
  });

  it('en "Más opciones", "Hacer delegado" llama a cambiar-rol con accion asignar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        fotoUrl={null}
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    fireEvent.click(getByText('Más opciones'));
    fireEvent.click(getByText('Hacer delegado'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/cambiar-rol',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            equipoId: 'eq-1',
            perfilId: 'perfil-2',
            rol: 'delegate',
            accion: 'asignar',
          }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('en "Más opciones", "Quitar como delegado" llama a cambiar-rol con accion quitar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        fotoUrl={null}
        rolesEquipo={['player', 'delegate']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    fireEvent.click(getByText('Más opciones'));
    fireEvent.click(getByText('Quitar como delegado'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/cambiar-rol',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            equipoId: 'eq-1',
            perfilId: 'perfil-2',
            rol: 'delegate',
            accion: 'quitar',
          }),
        }),
      ),
    );
  });

  it('la × sobre otro integrante pide confirmación antes de llamar a la API', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByTitle } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        fotoUrl={null}
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    fireEvent.click(getByTitle('Quitar a Bruno del plantel'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('"Hacer capitán" pide confirmación (transferencia) antes de llamar a la API', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        fotoUrl={null}
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    fireEvent.click(getByText('Más opciones'));
    fireEvent.click(getByText('Hacer capitán'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/cambiar-rol',
        expect.objectContaining({
          body: JSON.stringify({
            equipoId: 'eq-1',
            perfilId: 'perfil-2',
            rol: 'captain',
            accion: 'asignar',
          }),
        }),
      ),
    );
  });
});
