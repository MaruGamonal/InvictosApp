// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelDarDeBaja } from './PanelDarDeBaja';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.unstubAllGlobals();
});

describe('PanelDarDeBaja', () => {
  it('con el torneo en curso, muestra el aviso de partidos pendientes', () => {
    const { getByText } = render(<PanelDarDeBaja torneoId="t-1" equipoId="eq-1" torneoEnCurso />);
    expect(getByText(/los pendientes se dan por ganados a sus rivales/)).toBeTruthy();
  });

  it('sin el torneo en curso, no muestra el aviso', () => {
    const { queryByText } = render(
      <PanelDarDeBaja torneoId="t-1" equipoId="eq-1" torneoEnCurso={false} />,
    );
    expect(queryByText(/los pendientes se dan por ganados/)).toBeNull();
  });

  it('al confirmar, envía el motivo elegido y navega a la ficha del torneo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelDarDeBaja torneoId="t-1" equipoId="eq-1" torneoEnCurso={false} />,
    );
    fireEvent.click(getByText('Decisión propia'));
    fireEvent.click(getByText('Confirmar baja del torneo'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/inscripciones/dar-de-baja',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            torneoId: 't-1',
            equipoId: 'eq-1',
            motivo: 'withdrew',
            motivoDetalle: undefined,
          }),
        }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/torneo/t-1'));
  });

  it('siempre muestra que la baja no se puede deshacer', () => {
    const { getByText } = render(
      <PanelDarDeBaja torneoId="t-1" equipoId="eq-1" torneoEnCurso={false} />,
    );
    expect(getByText(/No se puede deshacer/)).toBeTruthy();
  });

  it('con motivo "Otro", el botón queda deshabilitado hasta describir qué pasó', () => {
    const { getByText, getByPlaceholderText } = render(
      <PanelDarDeBaja torneoId="t-1" equipoId="eq-1" torneoEnCurso={false} />,
    );
    fireEvent.click(getByText('Otro'));
    expect(getByText('Confirmar baja del torneo')).toBeDisabled();
    fireEvent.change(getByPlaceholderText('Contá qué pasó'), { target: { value: 'Se cayó todo' } });
    expect(getByText('Confirmar baja del torneo')).not.toBeDisabled();
  });
});
