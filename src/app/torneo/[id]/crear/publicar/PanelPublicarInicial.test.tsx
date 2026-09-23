// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelPublicarInicial } from './PanelPublicarInicial';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('PanelPublicarInicial', () => {
  it('al publicar, llama a la API y navega a la gestión del torneo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/publicar',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ torneoId: 't-1' }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/torneo/t-1/gestionar'));
  });

  it('si publicar falla, muestra el error y no navega', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });

  it('si faltan datos mínimos, lista los campos y enlaza a Configuración', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: {
          mensaje: 'Para publicar el torneo todavía falta completar algunos datos.',
          detalle: [
            { campo: 'fecha estimada de inicio', problema: 'Falta para poder publicar el torneo.' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByRole } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText(/Falta: fecha estimada de inicio/)).toBeTruthy());
    expect(getByRole('link', { name: 'Configuración' })).toHaveAttribute(
      'href',
      '/torneo/t-1/gestionar/configuracion',
    );
  });
});

describe('PanelPublicarInicial — sin verificar (D-51)', () => {
  /**
   * Publicar sin verificar no falla: el torneo nace no listado. La
   * pantalla tiene que decirlo acá, no mandar a la gestión sin avisar.
   */
  it('si el torneo quedó no listado, lo explica y ofrece verificar en vez de navegar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: { visibilidad: 'unlisted', motivoNoListado: 'organizacion_no_verificada' },
        }),
      }),
    );

    const { getByText, getByRole } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText(/Tu torneo está publicado/)).toBeTruthy());
    expect(getByText(/no va a aparecer en las búsquedas|aparezca en las búsquedas/)).toBeTruthy();
    expect(getByRole('button', { name: 'Verificar ahora' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  /** Quien no es Titular no puede pedirla: se le dice, no se le ofrece. */
  it('a quien no es Titular no le ofrece el botón, le dice quién la pide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { motivoNoListado: 'organizacion_no_verificada' } }),
      }),
    );

    const { getByText, queryByRole } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular={false} />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText(/Tu torneo está publicado/)).toBeTruthy());
    expect(queryByRole('button', { name: 'Verificar ahora' })).toBeNull();
    expect(getByText(/La verificación la pide quien creó la organización/)).toBeTruthy();
  });

  /** El límite de un torneo publicado se levanta verificando: la salida va ahí. */
  it('si choca con el límite de torneos publicados, ofrece verificar junto al error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: {
            codigo: 'LIMITE_TORNEOS_PUBLICADOS',
            mensaje:
              'Mientras tu organización no esté verificada, podés tener un solo torneo publicado a la vez.',
          },
        }),
      }),
    );

    const { getByText, getByRole } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText(/un solo torneo publicado a la vez/)).toBeTruthy());
    expect(getByRole('button', { name: 'Verificar ahora' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  /** Un error cualquiera no tiene nada que ver con verificar. */
  it('con un error que no es el límite, no ofrece verificar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: { codigo: 'NO_ENCONTRADO', mensaje: 'No existe.' },
        }),
      }),
    );

    const { getByText, queryByRole } = render(
      <PanelPublicarInicial torneoId="t-1" organizacionId="o-1" soyTitular />,
    );
    fireEvent.click(getByText('Publicar'));

    await waitFor(() => expect(getByText('No existe.')).toBeTruthy());
    expect(queryByRole('button', { name: 'Verificar ahora' })).toBeNull();
  });
});
