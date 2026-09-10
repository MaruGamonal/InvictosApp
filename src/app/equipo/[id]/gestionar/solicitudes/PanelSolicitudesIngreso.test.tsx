// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelSolicitudesIngreso } from './PanelSolicitudesIngreso';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SOLICITUDES = [
  { perfilId: 'perfil-1', nombreVisible: 'Julián Rodríguez' },
  { perfilId: 'perfil-2', nombreVisible: 'Damián Ortiz' },
];

describe('PanelSolicitudesIngreso', () => {
  it('al aceptar, llama a la API y muestra el resultado en la misma fila (sin desaparecer)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getAllByText } = render(
      <PanelSolicitudesIngreso equipoId="eq-1" solicitudes={SOLICITUDES} />,
    );
    const botonesAceptar = getAllByText('Aceptar');
    fireEvent.click(botonesAceptar[0]!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/resolver-solicitud',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ equipoId: 'eq-1', perfilId: 'perfil-1', aceptar: true }),
        }),
      ),
    );
    await waitFor(() => expect(getByText('ACEPTADA — YA ESTÁ EN EL PLANTEL')).toBeTruthy());
    expect(getByText('Damián Ortiz')).toBeTruthy();
  });

  it('al rechazar, llama a la API con aceptar false y muestra "RECHAZADA"', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getAllByText } = render(
      <PanelSolicitudesIngreso equipoId="eq-1" solicitudes={SOLICITUDES} />,
    );
    fireEvent.click(getAllByText('Rechazar')[0]!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/resolver-solicitud',
        expect.objectContaining({
          body: JSON.stringify({ equipoId: 'eq-1', perfilId: 'perfil-1', aceptar: false }),
        }),
      ),
    );
    await waitFor(() => expect(getByText('RECHAZADA')).toBeTruthy());
  });

  it('si la API falla, muestra el error y la fila sigue accionable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getAllByText } = render(
      <PanelSolicitudesIngreso equipoId="eq-1" solicitudes={SOLICITUDES} />,
    );
    fireEvent.click(getAllByText('Aceptar')[0]!);

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(getAllByText('Aceptar')).toHaveLength(2);
  });
});
