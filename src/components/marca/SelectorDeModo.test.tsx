// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SelectorDeModo } from './SelectorDeModo';

afterEach(cleanup);

describe('SelectorDeModo', () => {
  it('el chip dice en qué modo estás, no a cuál vas', () => {
    render(<SelectorDeModo modoActual="jugador" />);
    const chip = screen.getByLabelText('Modo: Jugador');
    expect(chip.tagName).toBe('SUMMARY');
    expect(chip.textContent).toContain('Jugador');
    expect(chip.textContent!.toLowerCase()).not.toContain('organizador');
  });

  it('el chip no dice "Modo": el texto es el estado, y al lado de la campana no hay lugar', () => {
    render(<SelectorDeModo modoActual="organizador" />);
    const chip = screen.getByLabelText('Modo: Organizador');
    expect(chip.textContent).toBe('Organizador');
    // Pero sí se nombra como modo para un lector de pantalla: "Organizador"
    // suelto no dice de qué es.
    expect(chip).toHaveAttribute('aria-label', 'Modo: Organizador');
  });

  it('el modo actual se marca y no es un enlace: elegir dónde ya estás no lleva a ningún lado', () => {
    render(<SelectorDeModo modoActual="jugador" />);

    // Dentro de la hoja: "Modo jugador" también está en el disparador.
    const hoja = screen.getByRole('group', { name: /elegí cómo usar/i });
    const actual = hoja.querySelector('[aria-current="true"]')!;
    expect(actual.textContent).toContain('Modo jugador');
    expect(actual.tagName).toBe('SPAN');

    expect(screen.queryByRole('link', { name: /modo jugador/i })).toBeNull();
  });

  it('el otro modo es un enlace a su panel', () => {
    render(<SelectorDeModo modoActual="jugador" />);
    const enlace = screen.getByRole('link', { name: /modo organizador/i });
    expect(enlace).toHaveAttribute('href', '/organizador/gestionar');
  });

  it('desde organizador, el enlace al modo jugador lleva el `volver` que evita el rebote', () => {
    render(<SelectorDeModo modoActual="organizador" />);
    // Sin `?volver=1`, `/inicio` rebota de vuelta al panel cuando la
    // cuenta organiza pero no juega: era un loop.
    expect(screen.getByRole('link', { name: /modo jugador/i })).toHaveAttribute(
      'href',
      '/inicio?volver=1',
    );
    expect(screen.queryByRole('link', { name: /modo organizador/i })).toBeNull();
  });

  it('las dos opciones dicen qué hay de cada lado, no solo su nombre', () => {
    render(<SelectorDeModo modoActual="jugador" />);
    expect(screen.getByText(/tus equipos, los torneos que jugás/i)).toBeInTheDocument();
    expect(screen.getByText(/los torneos que organizás/i)).toBeInTheDocument();
  });
});
