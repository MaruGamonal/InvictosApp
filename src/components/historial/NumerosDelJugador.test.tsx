// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NumerosDelJugador } from './NumerosDelJugador';
import type { TorneoJugado } from './tipos';

afterEach(cleanup);

function torneo(datos: Partial<TorneoJugado>): TorneoJugado {
  return {
    torneoId: crypto.randomUUID(),
    torneoNombre: 'Copa',
    modalidad: 'f5',
    ciudadNombre: null,
    fechaInicio: null,
    equipoId: 'e',
    equipoNombre: 'Los Pibes',
    partidosJugados: 0,
    goles: 0,
    tarjetasAmarillas: 0,
    tarjetasRojas: 0,
    vecesJugadorDelPartido: 0,
    ...datos,
  };
}

function valores(contenedor: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    [...contenedor.querySelectorAll('dl > div')].map((par) => [
      par.querySelector('dt')!.textContent!.replace(/^\S+\s/, ''),
      par.querySelector('dd')!.textContent!,
    ]),
  );
}

describe('NumerosDelJugador', () => {
  it('suma los torneos: goles, jugador del partido y tarjetas', () => {
    const { container } = render(
      <NumerosDelJugador
        historial={[
          torneo({ goles: 3, tarjetasAmarillas: 1, vecesJugadorDelPartido: 1 }),
          torneo({ goles: 2, tarjetasAmarillas: 2, tarjetasRojas: 1, vecesJugadorDelPartido: 2 }),
        ]}
      />,
    );
    expect(valores(container)).toEqual({
      Goles: '5',
      'Jugador del partido': '3',
      Amarillas: '3',
      Rojas: '1',
    });
  });

  /** Lo que suma y lo que resta, separados: una roja no es un logro más. */
  it('las tarjetas van aparte, bajo su propio título', () => {
    const { container, getByRole } = render(<NumerosDelJugador historial={[torneo({})]} />);
    const [logros, tarjetas] = container.querySelectorAll('dl');
    expect(logros!.textContent).toContain('Goles');
    expect(logros!.textContent).not.toMatch(/Amarillas|Rojas/);
    expect(tarjetas!.textContent).toMatch(/Amarillas.*Rojas/);
    expect(getByRole('heading', { name: 'Tarjetas' })).toBeTruthy();
  });

  /** En un total, cero rojas es un dato: no se esconde. */
  it('muestra los ceros', () => {
    const { container } = render(<NumerosDelJugador historial={[torneo({})]} />);
    expect(valores(container).Rojas).toBe('0');
  });

  /** La alineación es opcional: "0 partidos" se leería como "no jugó". */
  it('muestra los partidos sólo si hay alguno cargado', () => {
    const sin = render(<NumerosDelJugador historial={[torneo({})]} />);
    expect(valores(sin.container).Partidos).toBeUndefined();
    cleanup();
    const con = render(<NumerosDelJugador historial={[torneo({ partidosJugados: 4 })]} />);
    expect(valores(con.container).Partidos).toBe('4');
  });
});
