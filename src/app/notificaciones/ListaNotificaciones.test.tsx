// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ListaNotificaciones } from './ListaNotificaciones';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('ListaNotificaciones', () => {
  it('sin notificaciones, muestra el estado vacío', () => {
    const { getByText } = render(
      <ListaNotificaciones notificacionesIniciales={[]} cursorInicial={null} />,
    );
    expect(getByText('No tenés notificaciones por ahora.')).toBeTruthy();
  });

  it('al tocar una con enlace, marca leída y navega', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <ListaNotificaciones
        notificacionesIniciales={[
          {
            id: 'notif-1',
            tipo: 'team_invitation',
            entidadOrigenTipo: 'equipo',
            entidadOrigenId: 'eq-1',
            canal: 'in_app',
            estado: 'delivered',
            fechaGeneracion: new Date().toISOString(),
          },
        ]}
        cursorInicial={null}
      />,
    );

    fireEvent.click(getByText('Te invitaron a un equipo'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notificaciones/marcar-leida',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ notificacionId: 'notif-1' }) }),
    );
    expect(push).toHaveBeenCalledWith('/equipo/eq-1/invitacion');
  });

  it('una sin enlace (origen partido) no navega al tocarla', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <ListaNotificaciones
        notificacionesIniciales={[
          {
            id: 'notif-2',
            tipo: 'match_scheduled',
            entidadOrigenTipo: 'partido',
            entidadOrigenId: 'p-1',
            canal: 'in_app',
            estado: 'delivered',
            fechaGeneracion: new Date().toISOString(),
          },
        ]}
        cursorInicial={null}
      />,
    );

    fireEvent.click(getByText('Se programó tu partido'));
    expect(push).not.toHaveBeenCalled();
  });
});
