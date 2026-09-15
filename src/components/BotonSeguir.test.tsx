// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BotonSeguir } from './BotonSeguir';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('BotonSeguir', () => {
  afterEach(() => {
    cleanup();
    push.mockClear();
    vi.unstubAllGlobals();
  });

  it('al tocar "Seguir" manda tipoSeguido y entidadId, y pasa a "Siguiendo ✓"', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonSeguir tipoSeguido="tournament" entidadId="t-1" />);
    fireEvent.click(getByRole('button', { name: 'Seguir' }));

    await waitFor(() => {
      expect(getByRole('button', { name: 'Siguiendo ✓' })).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/seguir',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tipoSeguido: 'tournament', entidadId: 't-1' }),
      }),
    );
  });

  it('tocar de nuevo, ya siguiendo, manda a dejar de seguir', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonSeguir tipoSeguido="team" entidadId="e-1" />);
    fireEvent.click(getByRole('button', { name: 'Seguir' }));
    await waitFor(() => expect(getByRole('button', { name: 'Siguiendo ✓' })).toBeTruthy());

    fireEvent.click(getByRole('button', { name: 'Siguiendo ✓' }));
    await waitFor(() => expect(getByRole('button', { name: 'Seguir' })).toBeTruthy());
    expect(fetchMock).toHaveBeenLastCalledWith('/api/dejar-de-seguir', expect.anything());
  });

  it('sin sesión (401), manda a /ingresar con el torneo/equipo codificado para reengancharlo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole } = render(<BotonSeguir tipoSeguido="tournament" entidadId="t-1" />);
    fireEvent.click(getByRole('button', { name: 'Seguir' }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/ingresar?accion=seguir&tipoSeguido=tournament&entidadId=t-1'),
    );
    expect(getByRole('button', { name: 'Seguir' })).toBeTruthy();
  });

  it('muestra la cantidad inicial de seguidores recibida por prop', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    const { getByText } = render(
      <BotonSeguir tipoSeguido="team" entidadId="e-1" cantidadSeguidoresInicial={128} />,
    );
    expect(getByText('128 seguidores')).toBeTruthy();
  });

  it('sin seguidores todavía, muestra "0 seguidores" (no lo oculta)', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    const { getByText } = render(<BotonSeguir tipoSeguido="team" entidadId="e-1" />);
    expect(getByText('0 seguidores')).toBeTruthy();
  });

  it('con un solo seguidor, usa el singular', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    const { getByText } = render(
      <BotonSeguir tipoSeguido="team" entidadId="e-1" cantidadSeguidoresInicial={1} />,
    );
    expect(getByText('1 seguidor')).toBeTruthy();
  });

  it('al seguir, la cantidad sube en 1 de forma optimista; al dejar de seguir, vuelve a bajar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByText } = render(
      <BotonSeguir tipoSeguido="team" entidadId="e-1" cantidadSeguidoresInicial={5} />,
    );
    expect(getByText('5 seguidores')).toBeTruthy();

    fireEvent.click(getByRole('button', { name: 'Seguir' }));
    await waitFor(() => expect(getByText('6 seguidores')).toBeTruthy());

    fireEvent.click(getByRole('button', { name: 'Siguiendo ✓' }));
    await waitFor(() => expect(getByText('5 seguidores')).toBeTruthy());
  });

  it('un número grande de seguidores se muestra con separador de miles', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    const { getByText } = render(
      <BotonSeguir tipoSeguido="team" entidadId="e-1" cantidadSeguidoresInicial={12345} />,
    );
    expect(getByText('12.345 seguidores')).toBeTruthy();
  });
});
