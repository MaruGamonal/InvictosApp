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
  it('sobre uno mismo, solo muestra "Dejar equipo"', () => {
    const { getByText, queryByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-1"
        nombreVisible="Ana"
        rolesEquipo={['player']}
        esUnoMismo
        esCapitanViewer={false}
      />,
    );
    expect(getByText('Dejar equipo')).toBeTruthy();
    expect(queryByText('Quitar del plantel')).toBeNull();
  });

  it('sin ser capitán, sobre otro integrante no muestra acciones de gestión', () => {
    const { queryByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer={false}
      />,
    );
    expect(queryByText('Quitar del plantel')).toBeNull();
    expect(queryByText('Hacer delegado')).toBeNull();
  });

  it('el capitán ve badges con × para quitar delegado/DT, y chips para roles faltantes', () => {
    const { getByText, queryByTitle } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        rolesEquipo={['player', 'delegate']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    expect(queryByTitle('Quitar como delegado')).toBeTruthy();
    expect(getByText('Hacer capitán')).toBeTruthy();
    expect(getByText('Hacer DT')).toBeTruthy();
    expect(getByText('Quitar del plantel')).toBeTruthy();
  });

  it('al tocar "Hacer delegado", llama a cambiar-rol con accion asignar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
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

  it('al tocar la × de un badge de delegado, llama a cambiar-rol con accion quitar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByTitle } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        rolesEquipo={['player', 'delegate']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    fireEvent.click(getByTitle('Quitar como delegado'));

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

  it('"Quitar del plantel" pide confirmación antes de llamar a la API', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <FilaIntegranteGestion
        equipoId="eq-1"
        perfilId="perfil-2"
        nombreVisible="Bruno"
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
    fireEvent.click(getByText('Quitar del plantel'));
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
        rolesEquipo={['player']}
        esUnoMismo={false}
        esCapitanViewer
      />,
    );
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
