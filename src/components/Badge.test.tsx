// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('muestra la etiqueta visible, nunca el valor técnico', () => {
    render(<Badge campo="torneo.estado" valor="registration_open" />);
    expect(screen.getByText('Inscripciones abiertas')).toBeInTheDocument();
    expect(screen.queryByText('registration_open')).not.toBeInTheDocument();
  });

  it('jugado y ganado por presentación se distinguen (clases de color distintas)', () => {
    const { container: jugado } = render(<Badge campo="partido.estado" valor="played" />);
    const { container: walkover } = render(<Badge campo="partido.estado" valor="walkover" />);

    const claseJugado = jugado.querySelector('span')?.className;
    const claseWalkover = walkover.querySelector('span')?.className;
    expect(claseJugado).not.toBe(claseWalkover);
  });

  it('lanza en vez de mostrar un badge sin sentido si el valor no está en el catálogo', () => {
    expect(() => render(<Badge campo="torneo.estado" valor="no_existe" />)).toThrow();
  });
});
