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

    act(() => avisador.error('No se pudieron guardar los cambios'));
    act(() => vi.advanceTimersByTime(60_000));
    expect(queryByText('No se pudieron guardar los cambios')).toBeTruthy();

    fireEvent.click(getByRole('button', { name: 'Cerrar aviso' }));
    expect(queryByText('No se pudieron guardar los cambios')).toBeNull();
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
    act(() => avisador.error('No se pudieron guardar los cambios', id));

    expect(queryByText('Guardando…')).toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(queryByText('No se pudieron guardar los cambios')).toBeTruthy();
  });

  it('el éxito es role=status y el error role=alert (no solo un color distinto)', () => {
    const { container } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    expect(container.querySelector('[role="status"]')).toBeTruthy();

    act(() => avisador.error('No se pudieron guardar los cambios'));
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('cada tono trae su propio ícono: el color no es lo único que los distingue', () => {
    const { container } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    const conExito = container.querySelectorAll('svg').length;
    expect(conExito).toBeGreaterThan(0);

    act(() => avisador.error('No se pudieron guardar los cambios'));
    // El error suma su ícono y además el botón de cerrar.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(conExito);
  });

  it('con un error a la vista, la región pasa a assertive', () => {
    const { container } = montar();

    act(() => avisador.exito('Equipo actualizado'));
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();

    act(() => avisador.error('No se pudieron guardar los cambios'));
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
});
