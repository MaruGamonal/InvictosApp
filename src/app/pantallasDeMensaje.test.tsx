// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

import * as Sentry from '@sentry/nextjs';
import NoEncontrada from './not-found';
import ErrorDePantalla from './error';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Las pantallas a las que se llega cuando algo no está: el 404 y el
 * error de una pantalla. Antes eran el 404 de Next en inglés y un "Algo
 * salió mal" sin botones — ninguna ofrecía salida (`05`, principio 5).
 */
describe('la página que no existe', () => {
  it('lo dice en castellano, con la marca, y ofrece ir a los torneos o al inicio', () => {
    render(<NoEncontrada />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Esta página no existe');
    expect(screen.getByText('INVICTA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver torneos' })).toHaveAttribute('href', '/torneos');
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('el error de una pantalla', () => {
  it('reporta el error, no lo muestra, y ofrece reintentar o volver al inicio', () => {
    const reset = vi.fn();
    const error = new Error('detalle interno que no tiene que verse');
    render(<ErrorDePantalla error={error} reset={reset} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(screen.queryByText(/detalle interno/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Algo salió mal');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
  });
});
