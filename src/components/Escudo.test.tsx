// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Escudo } from './Escudo';

describe('Escudo', () => {
  it('sin imagen, muestra un placeholder con la inicial — nunca un espacio roto', () => {
    render(<Escudo nombre="Deportivo Rivadavia" />);
    expect(screen.getByRole('img', { name: 'Deportivo Rivadavia' })).toHaveTextContent('D');
  });

  it('con imagen, la muestra en lugar del placeholder', () => {
    render(<Escudo nombre="Boca" src="https://ejemplo.com/escudo.png" />);
    const img = screen.getByRole('img', { name: 'Boca' }) as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toContain('escudo.png');
  });

  /** Antes quedaba el nombre del equipo desbordado dentro del círculo. */
  it('si la imagen no carga, cae a la inicial', () => {
    render(<Escudo nombre="Los Pibes del Fondo" src="https://ejemplo.com/no-existe.png" />);
    fireEvent.error(screen.getByRole('img', { name: 'Los Pibes del Fondo' }));
    const escudo = screen.getByRole('img', { name: 'Los Pibes del Fondo' });
    expect(escudo.tagName).toBe('SPAN');
    expect(escudo).toHaveTextContent('L');
  });
});
