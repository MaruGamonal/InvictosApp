// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CabeceraDeModo } from './CabeceraDeModo';

vi.mock('./CampanaNotificaciones', () => ({ CampanaNotificaciones: () => null }));

afterEach(cleanup);

describe('CabeceraDeModo', () => {
  it('sin los dos roles no hay chip de modo: no hay a dónde cambiar', () => {
    render(<CabeceraDeModo modo="jugador" nombreUsuario="Pato" />);
    expect(screen.queryByLabelText(/^modo:/i)).toBeNull();
  });

  it('con los dos roles, el modo es un chip en la fila de la marca, no una fila propia', () => {
    const { container } = render(
      <CabeceraDeModo modo="jugador" nombreUsuario="Pato" puedeCambiarDeModo />,
    );

    const chip = screen.getByLabelText('Modo: Jugador');
    expect(chip.tagName).toBe('SUMMARY');

    // Vive arriba, en la fila de la marca, al lado de la campana.
    const filaDeLaMarca = container.querySelector('header > div:first-child')!;
    expect(filaDeLaMarca.contains(chip)).toBe(true);

    // Y la cabecera no gana una fila por el modo: solo marca y usuario.
    expect(container.querySelector('header')!.children).toHaveLength(2);
  });

  it('en organizador, el chip dice "Organizador"', () => {
    render(<CabeceraDeModo modo="organizador" nombreUsuario="Mariela" puedeCambiarDeModo />);
    expect(screen.getByLabelText('Modo: Organizador')).toBeInTheDocument();
  });

  it('con una sola organización, va como etiqueta al lado del nombre y sin fila propia', () => {
    const { container } = render(
      <CabeceraDeModo
        modo="organizador"
        nombreUsuario="Mariela"
        puedeCambiarDeModo
        alCostadoDelNombre={<p data-testid="etiqueta">Complejo San Martín</p>}
      />,
    );
    const filaUsuario = screen.getByText('Mariela').closest('div')!;
    expect(filaUsuario.querySelector('[data-testid="etiqueta"]')).not.toBeNull();
    expect(container.querySelector('header')!.children).toHaveLength(2);
  });

  it('con más de una, la organización se gana la fila entera', () => {
    const { container } = render(
      <CabeceraDeModo
        modo="organizador"
        nombreUsuario="Mariela"
        puedeCambiarDeModo
        controlDeOrganizacion={<p data-testid="selector">Complejo San Martín</p>}
      />,
    );
    const cabecera = container.querySelector('header')!;
    expect(cabecera.children).toHaveLength(3);

    const fila = cabecera.lastElementChild!;
    expect(fila.querySelector('[data-testid="selector"]')).not.toBeNull();
    // Sola en la fila: el modo ya no la comparte.
    expect(fila.children).toHaveLength(1);

    // Y no se repite arriba: decirlo dos veces es ruido.
    const filaUsuario = screen.getByText('Mariela').closest('div')!;
    expect(filaUsuario.querySelector('[data-testid="selector"]')).toBeNull();
  });
});
