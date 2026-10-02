// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ContenedorPublicidad } from './ContenedorPublicidad';

afterEach(cleanup);

describe('ContenedorPublicidad', () => {
  /**
   * Sin anuncio no hay caja. El contenedor vacío mostraba «Publicidad»
   * sobre un rectángulo de 90px: eso no se lee como «acá va a haber un
   * anuncio», se lee como algo que no cargó. Y hoy no hay de dónde
   * sacar anuncios, así que las tres superficies lo mostraban siempre.
   */
  it('sin hijos no renderiza nada', () => {
    const { container } = render(<ContenedorPublicidad />);
    expect(container.innerHTML).toBe('');
  });

  it('con un anuncio lo muestra, rotulado como publicidad (D-75)', () => {
    const { getByText, container } = render(
      <ContenedorPublicidad>
        <div data-testid="anuncio">Anuncio de prueba</div>
      </ContenedorPublicidad>,
    );

    expect(getByText('Publicidad')).toBeTruthy();
    expect(container.querySelector('[data-testid="anuncio"]')).toBeTruthy();
  });

  /** El rótulo acompaña al anuncio: nunca va solo, ni lo reemplaza. */
  it('el rótulo no aparece sin anuncio', () => {
    const { queryByText } = render(<ContenedorPublicidad />);
    expect(queryByText('Publicidad')).toBeNull();
  });
});
