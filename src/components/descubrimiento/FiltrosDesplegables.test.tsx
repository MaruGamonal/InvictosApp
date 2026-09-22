// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { FiltrosDesplegables, type DesplegableDeFiltro } from './FiltrosDesplegables';

const DESPLEGABLES: DesplegableDeFiltro[] = [
  {
    nombre: 'modalidad',
    etiqueta: 'Filtrar por modalidad',
    sinFiltrar: 'Cualquier modalidad',
    activo: 'f5',
    opciones: [
      { valor: 'f5', etiqueta: 'Fútbol 5' },
      { valor: 'f7', etiqueta: 'Fútbol 7' },
    ],
  },
  {
    nombre: 'categoriaGenero',
    etiqueta: 'Filtrar por categoría',
    sinFiltrar: 'Cualquier categoría',
    activo: '',
    opciones: [{ valor: 'female', etiqueta: 'Femenino' }],
  },
];

afterEach(cleanup);

describe('FiltrosDesplegables', () => {
  it('la opción «sin filtrar» vale cadena vacía: así se limpia el filtro', () => {
    const { getByLabelText } = render(
      <FiltrosDesplegables accion="/equipos" parametrosActuales={{}} desplegables={DESPLEGABLES} />,
    );
    const modalidad = getByLabelText('Filtrar por modalidad') as HTMLSelectElement;
    expect(modalidad.options[0]!.value).toBe('');
    expect(modalidad.options[0]!.textContent).toBe('Cualquier modalidad');
  });

  it('arranca con el valor que trae la URL', () => {
    const { getByLabelText } = render(
      <FiltrosDesplegables accion="/equipos" parametrosActuales={{}} desplegables={DESPLEGABLES} />,
    );
    expect((getByLabelText('Filtrar por modalidad') as HTMLSelectElement).value).toBe('f5');
    expect((getByLabelText('Filtrar por categoría') as HTMLSelectElement).value).toBe('');
  });

  it('conserva los demás parámetros y NO duplica los propios', () => {
    const { container } = render(
      <FiltrosDesplegables
        accion="/equipos"
        parametrosActuales={{ q: 'moras', modalidad: 'f5', duracion: 'single_day' }}
        desplegables={DESPLEGABLES}
      />,
    );
    const ocultos = Array.from(container.querySelectorAll('input[type="hidden"]')).map((campo) => [
      campo.getAttribute('name'),
      campo.getAttribute('value'),
    ]);
    expect(ocultos).toContainEqual(['q', 'moras']);
    expect(ocultos).toContainEqual(['duracion', 'single_day']);
    // Si viajara oculto además de en el <select>, el servidor recibiría
    // dos valores para el mismo nombre y el filtro no cambiaría.
    expect(ocultos.map(([nombre]) => nombre)).not.toContain('modalidad');
  });

  it('el cursor de paginación no se arrastra: filtrar vuelve a la primera página', () => {
    const { container } = render(
      <FiltrosDesplegables
        accion="/equipos"
        parametrosActuales={{ cursor: 'abc123' }}
        desplegables={DESPLEGABLES}
      />,
    );
    const nombres = Array.from(container.querySelectorAll('input[type="hidden"]')).map((campo) =>
      campo.getAttribute('name'),
    );
    expect(nombres).not.toContain('cursor');
  });

  it('un <select> necesita confirmar, así que hay botón (y anda sin JavaScript)', () => {
    const { getByRole } = render(
      <FiltrosDesplegables accion="/equipos" parametrosActuales={{}} desplegables={DESPLEGABLES} />,
    );
    expect(getByRole('button', { name: 'Filtrar' })).toHaveProperty('type', 'submit');
  });
});
