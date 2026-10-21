// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PestanasGestion } from './PestanasGestion';

let rutaActual = '/torneo/t-1/gestionar/resumen';

vi.mock('next/navigation', () => ({
  usePathname: () => rutaActual,
}));

afterEach(() => {
  cleanup();
  rutaActual = '/torneo/t-1/gestionar/resumen';
});

const SIN_PENDIENTES = { equipos: 0, fixture: 0, resultados: 0 };

describe('PestanasGestion', () => {
  it('marca la pestaña de la pantalla en la que se está', () => {
    const { getByRole } = render(
      <PestanasGestion torneoId="t-1" pendientes={SIN_PENDIENTES} rolEnTorneo="organizacion" />,
    );
    expect(getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page');
    expect(getByRole('link', { name: 'Equipos' })).not.toHaveAttribute('aria-current');
  });

  /**
   * Configuración tiene una pantalla por sección: con `===` la pestaña
   * se apagaba apenas se entraba a cualquiera de ellas, y la pantalla
   * dejaba de decir dónde estabas.
   */
  it('la pestaña de Configuración sigue marcada dentro de una sección', () => {
    rutaActual = '/torneo/t-1/gestionar/configuracion/formato';
    const { getByRole } = render(
      <PestanasGestion torneoId="t-1" pendientes={SIN_PENDIENTES} rolEnTorneo="organizacion" />,
    );
    expect(getByRole('link', { name: 'Config.' })).toHaveAttribute('aria-current', 'page');
  });

  /**
   * La señal de estado persistente: desde Fixture se tiene que poder
   * ver que hay equipos esperando respuesta, sin volver al Resumen.
   */
  it('muestra el contador de pendientes en la pestaña que corresponde', () => {
    const { getByRole } = render(
      <PestanasGestion
        torneoId="t-1"
        pendientes={{ equipos: 3, fixture: 0, resultados: 1 }}
        rolEnTorneo="organizacion"
      />,
    );

    expect(getByRole('link', { name: 'Equipos 3 pendientes' })).toBeTruthy();
    expect(getByRole('link', { name: 'Resultados 1 pendiente' })).toBeTruthy();
    // Sin pendientes no hay burbuja: un cero no es una noticia.
    expect(getByRole('link', { name: 'Fixture' })).toBeTruthy();
  });

  it('sin ningún pendiente, ninguna pestaña lleva número', () => {
    const { container } = render(
      <PestanasGestion torneoId="t-1" pendientes={SIN_PENDIENTES} rolEnTorneo="organizacion" />,
    );
    expect(container.textContent).toBe('ResumenEquiposFixtureResultadosConfig.');
  });

  /**
   * El Colaborador tiene permisos fijos (`06`, D-32) que cubren la
   * operación de la fecha. Resumen, Equipos y Configuración no son
   * suyas: ofrecerle la pestaña sería ofrecerle una pantalla que lo
   * rebota.
   */
  it('al colaborador le muestra sólo Fixture y Resultados', () => {
    const { container, queryByRole, getByRole } = render(
      <PestanasGestion torneoId="t-1" pendientes={SIN_PENDIENTES} rolEnTorneo="colaborador" />,
    );

    expect(container.textContent).toBe('FixtureResultados');
    expect(getByRole('link', { name: 'Resultados' })).toBeTruthy();
    for (const oculta of ['Resumen', 'Equipos', 'Config.']) {
      expect(queryByRole('link', { name: oculta })).toBeNull();
    }
  });

  it('al colaborador igual le llega el contador de las que ve', () => {
    const { getByRole, queryByRole } = render(
      <PestanasGestion
        torneoId="t-1"
        pendientes={{ equipos: 3, fixture: 0, resultados: 2 }}
        rolEnTorneo="colaborador"
      />,
    );
    expect(getByRole('link', { name: 'Resultados 2 pendientes' })).toBeTruthy();
    // El de Equipos no aparece por ningún lado: esa pestaña no existe para él.
    expect(queryByRole('link', { name: /Equipos/ })).toBeNull();
  });
});
