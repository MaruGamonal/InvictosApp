// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));

import { EnlaceVolver } from './EnlaceVolver';

afterEach(() => {
  cleanup();
  back.mockClear();
  vi.restoreAllMocks();
});

describe('EnlaceVolver', () => {
  it('si se llegó navegando la app, vuelve a la pantalla anterior', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${window.location.origin}/torneos`);
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    render(<EnlaceVolver alternativa="/inicio" />);
    const enlace = screen.getByRole('link', { name: '← Volver' });
    const seguido = fireEvent.click(enlace);
    expect(back).toHaveBeenCalledOnce();
    expect(seguido).toBe(false); // no sigue el href
  });

  it('si se llegó de afuera, va a la alternativa en vez de salir de la app', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://wa.me/algo');
    render(<EnlaceVolver alternativa="/inicio" />);
    const enlace = screen.getByRole('link', { name: '← Volver' });
    expect(enlace).toHaveAttribute('href', '/inicio');
    fireEvent.click(enlace);
    expect(back).not.toHaveBeenCalled();
  });
});
