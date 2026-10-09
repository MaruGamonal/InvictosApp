// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelAjustePuntos } from './PanelAjustePuntos';

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

function montar(extra: Partial<React.ComponentProps<typeof PanelAjustePuntos>> = {}) {
  return render(
    <PanelAjustePuntos
      torneoId="t-1"
      equipoId="e-1"
      nombreEquipo="Las Pumas"
      ajustePuntos={0}
      ultimoAjusteMotivo={null}
      {...extra}
    />,
  );
}

describe('PanelAjustePuntos', () => {
  it('sin ajustes arranca cerrado y ofrece abrirlo', () => {
    const { getByText } = montar();
    expect(getByText('Ajustar puntos')).toBeTruthy();
  });

  /** Lo acumulado se lee sin tener que abrir nada. */
  it('con un ajuste aplicado lo muestra en el botón', () => {
    const { getByText } = montar({ ajustePuntos: -3 });
    expect(getByText('Ajuste: -3')).toBeTruthy();
  });

  /**
   * El motivo es obligatorio —lo exige el servicio— y acá además es una
   * decisión de producto: tres puntos menos sin explicación al lado es
   * una tabla que el organizador no puede defender.
   */
  it('no deja aplicar sin motivo, ni con cero', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = montar();
    fireEvent.click(getByText('Ajustar puntos'));
    const boton = getByText('Aplicar ajuste') as HTMLButtonElement;

    fireEvent.change(getByLabelText('Puntos a sumar o restar a Las Pumas'), {
      target: { value: '-3' },
    });
    expect(boton.disabled).toBe(true);

    fireEvent.change(getByLabelText('Motivo del ajuste a Las Pumas'), {
      target: { value: 'Jugador no habilitado' },
    });
    expect(boton.disabled).toBe(false);

    // Cero no es un ajuste.
    fireEvent.change(getByLabelText('Puntos a sumar o restar a Las Pumas'), {
      target: { value: '0' },
    });
    expect(boton.disabled).toBe(true);
    fireEvent.click(boton);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aplica el ajuste con su motivo y refresca', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByLabelText } = montar();
    fireEvent.click(getByText('Ajustar puntos'));
    fireEvent.change(getByLabelText('Puntos a sumar o restar a Las Pumas'), {
      target: { value: '-3' },
    });
    fireEvent.change(getByLabelText('Motivo del ajuste a Las Pumas'), {
      target: { value: '  Jugador no habilitado  ' },
    });
    fireEvent.click(getByText('Aplicar ajuste'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/posiciones/ajustar-puntos',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            torneoId: 't-1',
            equipoId: 'e-1',
            ajuste: -3,
            motivo: 'Jugador no habilitado',
          }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('si el servidor rechaza, lo dice y no refresca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          ok: false,
          error: {
            detalle: [
              {
                campo: 'equipoId',
                problema: 'Este equipo todavía no tiene una tabla de posiciones asignada.',
              },
            ],
          },
        }),
      }),
    );

    const { getByText, getByLabelText } = montar();
    fireEvent.click(getByText('Ajustar puntos'));
    fireEvent.change(getByLabelText('Puntos a sumar o restar a Las Pumas'), {
      target: { value: '1' },
    });
    fireEvent.change(getByLabelText('Motivo del ajuste a Las Pumas'), {
      target: { value: 'Bonificación' },
    });
    fireEvent.click(getByText('Aplicar ajuste'));

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'Este equipo todavía no tiene una tabla de posiciones asignada.',
        undefined,
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
