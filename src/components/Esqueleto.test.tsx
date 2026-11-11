// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Esqueleto } from './Esqueleto';

afterEach(() => cleanup());

describe('Esqueleto', () => {
  it('anuncia que está cargando, sin leer los bloques decorativos', () => {
    const { container } = render(<Esqueleto tarjetas={2} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(container.querySelector('[aria-hidden="true"]')?.children).toHaveLength(3);
  });
});
