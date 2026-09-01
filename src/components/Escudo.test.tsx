// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
