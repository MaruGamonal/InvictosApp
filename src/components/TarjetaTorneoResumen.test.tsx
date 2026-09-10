// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { TarjetaTorneoResumen } from './TarjetaTorneoResumen';

afterEach(() => cleanup());

describe('TarjetaTorneoResumen', () => {
  it('un torneo publicado enlaza a su ficha pública', () => {
    const { getByRole } = render(
      <TarjetaTorneoResumen
        torneoId="t-1"
        nombre="Copa Otoño"
        categoriaGenero="male"
        modalidad="f5"
        estado="registration_open"
      />,
    );
    expect(getByRole('link')).toHaveAttribute('href', '/torneo/t-1');
  });

  it('un torneo en borrador enlaza a su gestión, no a la ficha pública (que le daría 404)', () => {
    const { getByRole } = render(
      <TarjetaTorneoResumen
        torneoId="t-1"
        nombre="Copa Otoño"
        categoriaGenero="male"
        modalidad="f5"
        estado="draft"
      />,
    );
    expect(getByRole('link')).toHaveAttribute('href', '/torneo/t-1/gestionar');
  });
});
