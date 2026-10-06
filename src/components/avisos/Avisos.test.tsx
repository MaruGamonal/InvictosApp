// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { ProveedorAvisos, useAvisos, type Avisador } from './Avisos';

/**
 * Un componente de prueba que expone el avisador, para dispararlo desde
 * el test sin depender de ninguna pantalla real.
 */
let avisador: Avisador;

function Sonda() {
  avisador = useAvisos();
  return null;
}

function montar() {
  return render(
    <ProveedorAvisos>
      <Sonda />
    </ProveedorAvisos>,
  );
}

describe('Avisos', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('el éxito se muestra y se va solo', () => {
    const { queryByText } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    expect(queryByText('Equipo actualizado')).toBeTruthy();

    act(() => vi.advanceTimersByTime(4000));
    expect(queryByText('Equipo actualizado')).toBeNull();
  });

  it('el error NO se va solo: se lee y se cierra a mano', () => {
    const { queryByText, getByRole } = montar();

    act(() => avisador.error('No pudimos guardar los cambios'));
    act(() => vi.advanceTimersByTime(60_000));
    expect(queryByText('No pudimos guardar los cambios')).toBeTruthy();

    fireEvent.click(getByRole('button', { name: 'Cerrar aviso' }));
    expect(queryByText('No pudimos guardar los cambios')).toBeNull();
  });

  it('«Guardando…» se queda mientras dura la operación', () => {
    const { queryByText } = montar();

    act(() => {
      avisador.cargando('Guardando…');
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(queryByText('Guardando…')).toBeTruthy();
  });

  it('el éxito reemplaza al «Guardando…» en vez de apilarse', () => {
    const { queryByText, container } = montar();

    let id = 0;
    act(() => {
      id = avisador.cargando('Guardando…');
    });
    act(() => avisador.exito('Equipo actualizado', id));

    expect(queryByText('Guardando…')).toBeNull();
    expect(queryByText('Equipo actualizado')).toBeTruthy();
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
  });

  it('el error también reemplaza al «Guardando…», y después no se va solo', () => {
    const { queryByText } = montar();

    let id = 0;
    act(() => {
      id = avisador.cargando('Guardando…');
    });
    act(() => avisador.error('No pudimos guardar los cambios', id));

    expect(queryByText('Guardando…')).toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(queryByText('No pudimos guardar los cambios')).toBeTruthy();
  });

  it('el éxito es role=status y el error role=alert (no solo un color distinto)', () => {
    const { container } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    expect(container.querySelector('[role="status"]')).toBeTruthy();

    act(() => avisador.error('No pudimos guardar los cambios'));
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('cada tono trae su propio ícono: el color no es lo único que los distingue', () => {
    const { container } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    const conExito = container.querySelectorAll('svg').length;
    expect(conExito).toBeGreaterThan(0);

    act(() => avisador.error('No pudimos guardar los cambios'));
    // El error suma su ícono y además el botón de cerrar.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(conExito);
  });

  it('con un error a la vista, la región pasa a assertive', () => {
    const { container } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();

    act(() => avisador.error('No pudimos guardar los cambios'));
    expect(container.querySelector('[aria-live="assertive"]')).toBeTruthy();
  });

  /**
   * Sin proveedor no explota: un componente con avisos se puede montar
   * suelto en un test sin armar toda la aplicación alrededor.
   */
  it('fuera del proveedor descarta el aviso sin romper', () => {
    render(<Sonda />);
    expect(() => avisador.exito('Equipo actualizado')).not.toThrow();
    expect(() => avisador.error('Algo falló')).not.toThrow();
  });

  /**
   * El bloqueo por cuenta sin confirmar: antes cada pantalla insertaba
   * su propio bloque dentro del contenido y movía todo lo de abajo.
   */
  describe('cuentaNoConfirmada', () => {
    it('avisa qué hacer y ofrece reenviar, sin irse solo', () => {
      const { queryByText, getByRole } = montar();

      act(() => avisador.cuentaNoConfirmada());
      expect(queryByText(/Confirmá tu cuenta para continuar/)).toBeTruthy();
      expect(getByRole('button', { name: 'Reenviar enlace' })).toBeTruthy();

      act(() => vi.advanceTimersByTime(60_000));
      expect(queryByText(/Confirmá tu cuenta para continuar/)).toBeTruthy();
    });

    it('cada pantalla puede precisar el mensaje sin rearmar el aviso', () => {
      const { queryByText, getByRole } = montar();
      act(() => avisador.cuentaNoConfirmada('Confirmá tu cuenta para crear un equipo.'));
      expect(queryByText('Confirmá tu cuenta para crear un equipo.')).toBeTruthy();
      expect(getByRole('button', { name: 'Reenviar enlace' })).toBeTruthy();
    });

    it('al reenviar pasa a «Reenviando…» y después a confirmado, en el mismo aviso', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const { queryByText, getByRole, container } = montar();
      act(() => avisador.cuentaNoConfirmada());
      act(() => {
        fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));
      });

      expect(queryByText('Reenviando el enlace…')).toBeTruthy();
      expect(container.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);

      await act(async () => {
        await Promise.resolve();
      });
      expect(queryByText(/Te reenviamos el enlace/)).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledWith('/api/reenviar-confirmacion', { method: 'POST' });

      vi.unstubAllGlobals();
    });

    it('si falla de nuestro lado, lo dice y deja volver a intentarlo', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
      );

      const { queryByText, getByRole } = montar();
      act(() => avisador.cuentaNoConfirmada());
      act(() => {
        fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(queryByText('No pudimos reenviarlo. Probá de nuevo.')).toBeTruthy();
      expect(getByRole('button', { name: 'Reenviar enlace' })).toBeTruthy();

      vi.unstubAllGlobals();
    });

    /**
     * El caso que se veía en vivo: el límite de reenvíos ya agotado. El
     * servidor manda el motivo exacto y el aviso lo mostraba como «No
     * pudimos reenviarlo. Probá de nuevo.» con el botón al lado — o sea,
     * invitando a repetir justo lo que acababa de ser rechazado por
     * repetirlo.
     */
    it('si el servidor explica el rechazo, muestra ese motivo y no ofrece reintentar', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            ok: false,
            error: {
              codigo: 'DATOS_INVALIDOS',
              mensaje: 'Hay datos que faltan o que no tienen el formato esperado.',
              detalle: [
                { campo: 'email', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
              ],
            },
          }),
        }),
      );

      const { queryByText, queryByRole } = montar();
      act(() => avisador.cuentaNoConfirmada());
      act(() => {
        fireEvent.click(queryByRole('button', { name: 'Reenviar enlace' })!);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(queryByText('Demasiados intentos. Probá de nuevo más tarde.')).toBeTruthy();
      expect(queryByText('No pudimos reenviarlo. Probá de nuevo.')).toBeNull();
      expect(queryByRole('button', { name: 'Reenviar enlace' })).toBeNull();

      vi.unstubAllGlobals();
    });

    /**
     * Reportado en vivo: al reintentar desde el aviso de error quedaban
     * dos «No pudimos reenviarlo» idénticos, uno debajo del otro. El
     * botón le pasaba a `pedirReenvio` el id del aviso **anterior** —el
     * que ya había sido reemplazado—, y reemplazar un id que no existe
     * no reemplaza nada: agrega.
     */
    it('reintentar desde el aviso de error no apila un segundo aviso', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
      );

      const { getByRole, container } = montar();
      act(() => avisador.cuentaNoConfirmada());

      for (const _ of [0, 1]) {
        act(() => {
          fireEvent.click(getByRole('button', { name: 'Reenviar enlace' }));
        });
        await act(async () => {
          await Promise.resolve();
        });
      }

      expect(container.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);

      vi.unstubAllGlobals();
    });

    it('la advertencia trae su propio ícono: no se distingue solo por el color', () => {
      const { container } = montar();
      act(() => avisador.cuentaNoConfirmada());
      expect(container.querySelector('svg')).toBeTruthy();
    });
  });
});
