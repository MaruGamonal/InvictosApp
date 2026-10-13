// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelDondeSeVe } from './PanelDondeSeVe';

const refresh = vi.fn();
const error = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/components/avisos/Avisos', () => ({
  useAvisos: () => ({ cargando: vi.fn(), exito: vi.fn(), error }),
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  error.mockClear();
  vi.unstubAllGlobals();
});

function montar(extra: Partial<React.ComponentProps<typeof PanelDondeSeVe>> = {}) {
  return render(
    <PanelDondeSeVe
      torneoId="t-1"
      estado="registration_open"
      visibilidad="public"
      organizacionVerificada
      {...extra}
    />,
  );
}

function okFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PanelDondeSeVe', () => {
  it('publicado en las búsquedas: ofrece sacarlo', async () => {
    const fetchMock = okFetch();
    const { getByText } = montar();
    expect(getByText('Este torneo aparece en las búsquedas.')).toBeTruthy();

    fireEvent.click(getByText('Quitar de las búsquedas'));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/visibilidad',
        expect.objectContaining({
          body: JSON.stringify({ torneoId: 't-1', visibilidad: 'unlisted' }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('fuera de las búsquedas: ofrece devolverlo', async () => {
    const fetchMock = okFetch();
    const { getByText } = montar({ visibilidad: 'unlisted' });
    expect(getByText(/se comparte por enlace y funciona completo/)).toBeTruthy();

    fireEvent.click(getByText('Volver a las búsquedas'));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/visibilidad',
        expect.objectContaining({
          body: JSON.stringify({ torneoId: 't-1', visibilidad: 'public' }),
        }),
      ),
    );
  });

  /**
   * Volver a las búsquedas es entrar al descubrimiento, y eso exige la
   * organización verificada (D-51) — igual que al publicar. El botón
   * apagado sin decir por qué sería una puerta cerrada sin cartel.
   */
  it('sin verificar, no puede volver a las búsquedas y dice por qué', () => {
    const { getByText } = montar({ visibilidad: 'unlisted', organizacionVerificada: false });
    expect((getByText('Volver a las búsquedas') as HTMLButtonElement).disabled).toBe(true);
    expect(getByText(/primero verificá tu organización/)).toBeTruthy();
  });

  it('con las inscripciones abiertas, ofrece volver a borrador', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    const { getByText } = montar();
    fireEvent.click(getByText('Volver a borrador'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/despublicar',
        expect.objectContaining({ body: JSON.stringify({ torneoId: 't-1' }) }),
      ),
    );
  });

  it('si se cancela la confirmación, no pasa nada', () => {
    const fetchMock = okFetch();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );

    const { getByText } = montar();
    fireEvent.click(getByText('Volver a borrador'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * Más adelante ya hay fixture o partidos, y volver a borrador no
   * sería deshacer la publicación sino borrar un torneo que ocurrió.
   */
  it.each(['registration_closed', 'in_progress', 'suspended'])(
    'en %s no ofrece volver a borrador',
    (estado) => {
      okFetch();
      const { queryByText, getByText } = montar({ estado });
      expect(queryByText('Volver a borrador')).toBeNull();
      // Pero sacarlo de las búsquedas sigue estando: es lo que sirve
      // justamente cuando ya hay equipos adentro.
      expect(getByText('Quitar de las búsquedas')).toBeTruthy();
    },
  );

  it('si el servidor rechaza, muestra su motivo y no refresca', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          ok: false,
          error: {
            codigo: 'TORNEO_YA_TIENE_EQUIPOS',
            mensaje:
              'Ya hay equipos en este torneo, así que no se puede volver a borrador. Podés suspenderlo o cancelarlo.',
          },
        }),
      }),
    );

    const { getByText } = montar();
    fireEvent.click(getByText('Volver a borrador'));

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Podés suspenderlo'), undefined),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
