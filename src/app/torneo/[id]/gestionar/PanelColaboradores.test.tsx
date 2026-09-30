// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PanelColaboradores } from './PanelColaboradores';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const COLABORADORA = { usuarioId: 'u-1', nombreVisible: 'Lucía Fernández' };

describe('PanelColaboradores', () => {
  /**
   * Revisión de UX: la fila decía solo el nombre, y qué podía hacer esa
   * persona estaba en un párrafo de 205 caracteres al pie de la lista.
   * El rol es una etiqueta; el alcance —este torneo— ya lo dice el
   * título del acordeón que contiene al panel.
   */
  it('cada fila dice el rol, sin párrafo que lo explique al pie', () => {
    const { getByText, queryByText } = render(
      <PanelColaboradores torneoId="t-1" colaboradores={[COLABORADORA]} />,
    );

    expect(getByText('Lucía Fernández')).toBeTruthy();
    expect(getByText('Colaborador')).toBeTruthy();
    expect(queryByText(/Va a poder cargar resultados/)).toBeNull();
    expect(queryByText(/Es una asignación por torneo/)).toBeNull();
  });

  it('sin colaboradores muestra el estado vacío y el formulario', () => {
    const { getByText, queryByText } = render(
      <PanelColaboradores torneoId="t-1" colaboradores={[]} />,
    );

    expect(getByText(/todavía no tiene colaboradores asignados/)).toBeTruthy();
    expect(getByText('Asignar colaborador')).toBeTruthy();
    expect(queryByText('Colaborador')).toBeNull();
  });
});
