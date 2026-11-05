// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { BuscadorCiudad, type ProvinciaConCiudades } from './BuscadorCiudad';

afterEach(() => cleanup());

const PROVINCIAS: ProvinciaConCiudades[] = [
  {
    id: 'ba',
    nombre: 'Buenos Aires',
    ciudades: [
      { id: 'avellaneda', nombre: 'Avellaneda' },
      { id: 'azul', nombre: 'Azul' },
      { id: 'banfield', nombre: 'Banfield' },
    ],
  },
  {
    id: 'cba',
    nombre: 'Córdoba',
    ciudades: [{ id: 'cordoba', nombre: 'Córdoba' }],
  },
];

/** El buscador dentro de un formulario de verdad, con el valor controlado. */
function Formulario({ onSubmit = vi.fn(), inicial = '' }) {
  const [ciudad, setCiudad] = useState(inicial);
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        onSubmit(ciudad);
      }}
    >
      <label htmlFor="ciudad">Ciudad</label>
      <BuscadorCiudad id="ciudad" provincias={PROVINCIAS} value={ciudad} onChange={setCiudad} />
      <input aria-label="Campo siguiente" />
    </form>
  );
}

const campo = () => screen.getByRole('combobox', { name: 'Ciudad' });
const tecla = (key: string) => fireEvent.keyDown(campo(), { key });

describe('BuscadorCiudad', () => {
  it('las opciones no entran en el orden de Tab: el foco queda en el campo', () => {
    // Pasó: cada ciudad era un <button>, y salir del campo con Tab era
    // recorrer el catálogo entero — 274 paradas.
    render(<Formulario />);
    fireEvent.focus(campo());
    const opciones = screen.getAllByRole('option');
    expect(opciones).toHaveLength(4);
    for (const opcion of opciones) {
      expect(opcion.tagName).not.toBe('BUTTON');
      expect(opcion).not.toHaveAttribute('tabindex');
    }
  });

  it('el panel con scroll no se puede enfocar con Tab (Chrome lo haría por defecto)', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    expect(screen.getByRole('listbox')).toHaveAttribute('tabindex', '-1');
  });

  it('las flechas mueven la opción activa, la marcan con aria-activedescendant y dan la vuelta', () => {
    render(<Formulario />);
    fireEvent.focus(campo());

    tecla('ArrowDown');
    expect(campo()).toHaveAttribute('aria-activedescendant', screen.getByText('Avellaneda').id);

    tecla('ArrowDown');
    expect(campo()).toHaveAttribute('aria-activedescendant', screen.getByText('Azul').id);

    tecla('ArrowUp');
    tecla('ArrowUp');
    // Desde la primera, arriba da la vuelta a la última (otra provincia).
    expect(campo()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Córdoba' }).id,
    );
  });

  it('Enter elige la activa, cierra la lista y no envía el formulario', () => {
    const onSubmit = vi.fn();
    render(<Formulario onSubmit={onSubmit} />);
    fireEvent.focus(campo());
    tecla('ArrowDown');
    tecla('ArrowDown');
    tecla('Enter');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(campo()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(campo()).toHaveValue('Azul');
  });

  it('con texto escrito y sin opción activa, Enter elige la primera coincidencia', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: 'banf' } });
    tecla('Enter');
    expect(campo()).toHaveValue('Banfield');
  });

  it('anuncia cuántas coincidencias hay mientras se escribe', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: 'ba' } });
    // Banfield y Córdoba.
    expect(screen.getByRole('status')).toHaveTextContent('2 ciudades');
    fireEvent.change(campo(), { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No hay ciudades con ese nombre.');
  });

  it('Escape cierra sin cambiar la ciudad elegida', () => {
    render(<Formulario inicial="azul" />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: 'banf' } });
    tecla('Escape');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(campo()).toHaveValue('Azul');
  });

  it('salir del campo cierra la lista: no queda tapando el campo siguiente', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.blur(campo());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(campo()).toHaveAttribute('aria-expanded', 'false');
  });

  it('tocar una opción la elige, sin que el campo pierda el foco antes', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    const opcion = screen.getByRole('option', { name: 'Banfield' });
    // El panel cancela el mousedown: es lo que evita el blur que cerraría
    // la lista antes del clic.
    expect(fireEvent.mouseDown(opcion)).toBe(false);
    fireEvent.click(opcion);
    expect(campo()).toHaveValue('Banfield');
  });

  it('encuentra sin tildes ni mayúsculas: "cordoba" encuentra Córdoba', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: 'CORDOBA' } });
    expect(screen.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual(['Córdoba']);
  });

  it('agrupa por provincia con un grupo nombrado', () => {
    render(<Formulario />);
    fireEvent.focus(campo());
    expect(screen.getByRole('group', { name: 'Buenos Aires' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Córdoba' })).toBeInTheDocument();
  });
});
