// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CabeceraDeTarea } from './CabeceraDeTarea';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));

afterEach(cleanup);

describe('CabeceraDeTarea', () => {
  /**
   * El nombre del equipo va en el contexto, no en el título: con un
   * nombre largo el `<h1>` ocupaba tres renglones y empujaba el
   * formulario fuera de la pantalla.
   */
  it('el título es la tarea y el nombre va aparte, arriba', () => {
    const { getByRole, getByText } = render(
      <CabeceraDeTarea
        volverA="/equipo/1"
        contexto="Los Pibes del Fondo"
        titulo="Gestionar equipo"
      />,
    );
    expect(getByRole('heading', { level: 1 }).textContent).toBe('Gestionar equipo');
    expect(getByText('Los Pibes del Fondo').tagName).toBe('P');
  });

  it('siempre ofrece volver con texto, no una flecha sola', () => {
    const { getByRole } = render(
      <CabeceraDeTarea volverA="/notificaciones" titulo="Preferencias" />,
    );
    const volver = getByRole('link', { name: '← Volver' });
    expect(volver.getAttribute('href')).toBe('/notificaciones');
  });

  /** A restablecer la contraseña se llega desde un correo: no hay adónde volver. */
  it('sin destino, no muestra "Volver"', () => {
    const { queryByRole } = render(<CabeceraDeTarea titulo="Elegí una contraseña nueva" />);
    expect(queryByRole('link')).toBeNull();
  });
});
