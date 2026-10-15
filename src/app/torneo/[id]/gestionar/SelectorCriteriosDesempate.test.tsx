// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { CriterioDesempate } from '@/services/torneos/obtenerGestionTorneo';
import { SelectorCriteriosDesempate } from './SelectorCriteriosDesempate';

const TODOS: CriterioDesempate[] = ['goal_difference', 'goals_for', 'head_to_head'];

afterEach(cleanup);

function montar(valor: CriterioDesempate[] = TODOS) {
  const alCambiar = vi.fn();
  const vista = render(<SelectorCriteriosDesempate valor={valor} alCambiar={alCambiar} />);
  return { ...vista, alCambiar };
}

describe('SelectorCriteriosDesempate', () => {
  it('numera los criterios en el orden en que se aplican', () => {
    const { getByText, container } = montar();
    expect(getByText('Diferencia de gol')).toBeTruthy();
    const numeros = [...container.querySelectorAll('span')]
      .map((s) => s.textContent)
      .filter((t) => t === '1' || t === '2' || t === '3');
    expect(numeros).toEqual(['1', '2', '3']);
  });

  it('bajar un criterio lo intercambia con el siguiente', () => {
    const { getByLabelText, alCambiar } = montar();
    fireEvent.click(getByLabelText('Bajar Diferencia de gol'));
    expect(alCambiar).toHaveBeenCalledWith(['goals_for', 'goal_difference', 'head_to_head']);
  });

  it('subir un criterio lo intercambia con el anterior', () => {
    const { getByLabelText, alCambiar } = montar();
    fireEvent.click(getByLabelText('Subir Goles a favor'));
    expect(alCambiar).toHaveBeenCalledWith(['goals_for', 'goal_difference', 'head_to_head']);
  });

  /** Los extremos no tienen a dónde ir: el botón está apagado, no se ignora el clic. */
  it('el primero no sube y el último no baja', () => {
    const { getByLabelText } = montar();
    expect((getByLabelText('Subir Diferencia de gol') as HTMLButtonElement).disabled).toBe(true);
    expect(
      (getByLabelText('Bajar Lo que hicieron entre ellos') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('quitar un criterio lo saca de la lista y lo ofrece de vuelta', () => {
    const { getByLabelText, alCambiar } = montar();
    fireEvent.click(getByLabelText('Quitar Goles a favor'));
    expect(alCambiar).toHaveBeenCalledWith(['goal_difference', 'head_to_head']);
  });

  it('un criterio sin usar se puede volver a agregar, al final', () => {
    const { getByLabelText, alCambiar } = montar(['goal_difference']);
    fireEvent.click(getByLabelText('Usar Goles a favor'));
    expect(alCambiar).toHaveBeenCalledWith(['goal_difference', 'goals_for']);
  });

  /** Y vuelve al final, no a su lugar "natural": el orden lo decide quien organiza. */
  it('el que se agrega queda último', () => {
    const { getByLabelText, alCambiar } = montar(['head_to_head']);
    fireEvent.click(getByLabelText('Usar Diferencia de gol'));
    expect(alCambiar).toHaveBeenCalledWith(['head_to_head', 'goal_difference']);
  });

  /**
   * Sin ningún criterio no habría forma de romper un empate, y el
   * servicio lo rechaza (`.min(1)`). Mejor que el botón no se pueda
   * tocar a que el guardado falle.
   */
  it('el último criterio no se puede quitar', () => {
    const { getByLabelText } = montar(['goal_difference']);
    expect((getByLabelText('Quitar Diferencia de gol') as HTMLButtonElement).disabled).toBe(true);
  });

  /** Los puntos no son un criterio: son el orden mismo. */
  it('aclara que los puntos van primero', () => {
    const { getByText } = montar();
    expect(getByText(/Primero los puntos/)).toBeTruthy();
  });
});
