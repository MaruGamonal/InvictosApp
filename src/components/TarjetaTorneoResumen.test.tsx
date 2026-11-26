// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

  it('el estado como badge del catálogo, no como texto libre (`04`, sección 6)', () => {
    // Pasó: "En curso" iba en una pastilla gris en el inicio y en verde
    // en la ficha — el mismo estado de dos colores.
    render(
      <TarjetaTorneoResumen
        torneoId="t-1"
        nombre="Copa Otoño"
        categoriaGenero="mixed"
        modalidad="f5"
        estadoComoBadge="in_progress"
        etiquetaDerecha="esto no se muestra"
      />,
    );
    const badge = screen.getByText('En curso');
    expect(badge.className).toMatch(/exito/);
    expect(screen.queryByText('esto no se muestra')).not.toBeInTheDocument();
  });
});
