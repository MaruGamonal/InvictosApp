// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { FilaInvitacionPendiente } from './FilaInvitacionPendiente';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

describe('FilaInvitacionPendiente', () => {
  it('muestra el nombre y el badge de invitación pendiente', () => {
    const { getByText } = render(
      <FilaInvitacionPendiente
        equipoId="eq-1"
        perfilId="p-1"
        nombreVisible="Leo Ferrari"
        fotoUrl={null}
        rol="player"
      />,
    );
    expect(getByText('Leo Ferrari')).toBeTruthy();
    expect(getByText('Invitación pendiente')).toBeTruthy();
  });

  it('al tocar la ×, cancela la invitación', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByTitle } = render(
      <FilaInvitacionPendiente
        equipoId="eq-1"
        perfilId="p-1"
        nombreVisible="Leo Ferrari"
        fotoUrl={null}
        rol="player"
      />,
    );
    fireEvent.click(getByTitle('Cancelar la invitación a Leo Ferrari'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipos/cancelar-invitacion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ equipoId: 'eq-1', perfilId: 'p-1', rol: 'player' }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
