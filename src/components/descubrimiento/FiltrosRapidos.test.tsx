// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { FiltrosRapidos, type FilaDeFiltros } from './FiltrosRapidos';

const FILAS: FilaDeFiltros[] = [
  {
    etiqueta: 'Filtrar por modalidad',
    parametros: [
      {
        nombre: 'modalidad',
        activo: 'f5',
        opciones: [
          { valor: 'f5', etiqueta: 'Fútbol 5' },
          { valor: 'f7', etiqueta: 'Fútbol 7' },
        ],
      },
    ],
  },
];

afterEach(cleanup);

describe('FiltrosRapidos', () => {
  it('el chip activo manda cadena vacía: tocarlo lo apaga', () => {
    const { getByRole } = render(
      <FiltrosRapidos accion="/equipos" parametrosActuales={{}} filas={FILAS} />,
    );
    expect(getByRole('button', { name: 'Fútbol 5' })).toHaveProperty('value', '');
    expect(getByRole('button', { name: 'Fútbol 7' })).toHaveProperty('value', 'f7');
  });

  it('el activo se anuncia con aria-pressed, no solo con el color', () => {
    const { getByRole } = render(
      <FiltrosRapidos accion="/equipos" parametrosActuales={{}} filas={FILAS} />,
    );
    expect(getByRole('button', { name: 'Fútbol 5' }).getAttribute('aria-pressed')).toBe('true');
    expect(getByRole('button', { name: 'Fútbol 7' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('conserva los demás parámetros y NO duplica el propio', () => {
    const { container } = render(
      <FiltrosRapidos
        accion="/equipos"
        parametrosActuales={{ q: 'moras', modalidad: 'f5', categoriaGenero: 'female' }}
        filas={FILAS}
      />,
    );
    const ocultos = Array.from(container.querySelectorAll('input[type="hidden"]')).map((campo) => [
      campo.getAttribute('name'),
      campo.getAttribute('value'),
    ]);
    expect(ocultos).toContainEqual(['q', 'moras']);
    expect(ocultos).toContainEqual(['categoriaGenero', 'female']);
    // Si `modalidad` viajara oculta además de en el botón, el servidor
    // recibiría dos valores para el mismo nombre y el filtro no cambiaría.
    expect(ocultos.map(([nombre]) => nombre)).not.toContain('modalidad');
  });

  it('el cursor de paginación no se arrastra: filtrar vuelve a la primera página', () => {
    const { container } = render(
      <FiltrosRapidos
        accion="/equipos"
        parametrosActuales={{ q: 'moras', cursor: 'abc123' }}
        filas={FILAS}
      />,
    );
    const nombres = Array.from(container.querySelectorAll('input[type="hidden"]')).map((campo) =>
      campo.getAttribute('name'),
    );
    expect(nombres).not.toContain('cursor');
  });

  it('una fila puede combinar dos parámetros distintos', () => {
    const { getByRole } = render(
      <FiltrosRapidos
        accion="/torneos"
        parametrosActuales={{}}
        filas={[
          {
            etiqueta: 'Duración e inscripciones',
            parametros: [
              {
                nombre: 'duracion',
                activo: '',
                opciones: [{ valor: 'single_day', etiqueta: 'Un día' }],
              },
              {
                nombre: 'abiertas',
                activo: '1',
                opciones: [{ valor: '1', etiqueta: 'Inscripciones abiertas' }],
              },
            ],
          },
        ]}
      />,
    );
    expect(getByRole('button', { name: 'Un día' })).toHaveProperty('name', 'duracion');
    expect(getByRole('button', { name: 'Inscripciones abiertas' })).toHaveProperty(
      'name',
      'abiertas',
    );
  });
});
