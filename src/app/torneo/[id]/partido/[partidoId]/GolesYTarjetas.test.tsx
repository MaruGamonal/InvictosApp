// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { EventoDelPartido } from '@/services/competencia/obtenerPartido';
import { GolesYTarjetas } from './GolesYTarjetas';

afterEach(cleanup);

const local = { id: 'local', nombre: 'Los Pibes' };
const visitante = { id: 'visita', nombre: 'Racing del Barrio' };

function evento(datos: Partial<EventoDelPartido>): EventoDelPartido {
  return {
    perfilId: 'p1',
    nombreVisible: 'Ana',
    equipoId: 'local',
    tipo: 'goal',
    minuto: null,
    ...datos,
  };
}

function columna(nombreEquipo: string) {
  return screen.getByText(nombreEquipo, { selector: 'span' }).parentElement!;
}

describe('GolesYTarjetas', () => {
  it('sin goles, tarjetas ni jugador del partido, no dibuja nada', () => {
    const { container } = render(
      <GolesYTarjetas local={local} visitante={visitante} eventos={[]} jugadorDelPartido={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  /** "Ana ×3" se lee mejor que tres renglones iguales. */
  it('agrupa los goles de una misma persona', () => {
    render(
      <GolesYTarjetas
        local={local}
        visitante={visitante}
        eventos={[
          evento({}),
          evento({}),
          evento({}),
          evento({ perfilId: 'p2', nombreVisible: 'Bea', equipoId: 'visita' }),
        ]}
        jugadorDelPartido={null}
      />,
    );
    expect(within(columna('Los Pibes')).getByText('×3')).toBeTruthy();
    expect(within(columna('Racing del Barrio')).getByText('Bea')).toBeTruthy();
  });

  /** El gol en contra suma al otro equipo: va en su columna, marcado. */
  it('pone el gol en contra en la columna del equipo al que le sumó', () => {
    render(
      <GolesYTarjetas
        local={local}
        visitante={visitante}
        eventos={[evento({ tipo: 'own_goal', nombreVisible: 'Ana', equipoId: 'local' })]}
        jugadorDelPartido={null}
      />,
    );
    const visita = columna('Racing del Barrio');
    expect(within(visita).getByText('Ana')).toBeTruthy();
    expect(within(visita).getByText(/en contra/)).toBeTruthy();
    expect(within(columna('Los Pibes')).queryByText('Ana')).toBeNull();
  });

  it('muestra el jugador del partido y las tarjetas aparte', () => {
    render(
      <GolesYTarjetas
        local={local}
        visitante={visitante}
        eventos={[evento({ tipo: 'yellow_card', nombreVisible: 'Ana' })]}
        jugadorDelPartido={{ perfilId: 'p9', nombreVisible: 'Caro' }}
      />,
    );
    expect(screen.getByText('Jugador del partido')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Caro' }).getAttribute('href')).toBe('/jugador/p9');
    expect(screen.getByRole('heading', { name: 'Tarjetas' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Goles' })).toBeNull();
  });
});
