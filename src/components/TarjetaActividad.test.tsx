// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { TarjetaActividad, type ItemActividadTarjeta } from './TarjetaActividad';

afterEach(() => cleanup());

describe('TarjetaActividad', () => {
  it('un resultado publicado muestra el marcador y enlaza al torneo', () => {
    const item: ItemActividadTarjeta = {
      tipo: 'result_published',
      id: 'a-1',
      fecha: new Date().toISOString(),
      partidoId: 'p-1',
      torneo: { id: 't-1', nombre: 'Copa Otoño', imagenUrl: null },
      equipoLocal: { id: 'e-1', nombre: 'Los Pibes', escudoUrl: null },
      equipoVisitante: { id: 'e-2', nombre: 'Rival FC', escudoUrl: null },
      golesLocal: 2,
      golesVisitante: 1,
      jugadorDelPartido: null,
    };
    const { getByRole, getByText } = render(<TarjetaActividad item={item} />);
    expect(getByRole('link')).toHaveAttribute('href', '/torneo/t-1');
    expect(getByText('Los Pibes 2 - 1 Rival FC')).toBeTruthy();
  });

  it('un resultado con jugador del partido lo muestra', () => {
    const item: ItemActividadTarjeta = {
      tipo: 'result_published',
      id: 'a-1',
      fecha: new Date().toISOString(),
      partidoId: 'p-1',
      torneo: { id: 't-1', nombre: 'Copa Otoño', imagenUrl: null },
      equipoLocal: { id: 'e-1', nombre: 'Los Pibes', escudoUrl: null },
      equipoVisitante: { id: 'e-2', nombre: 'Rival FC', escudoUrl: null },
      golesLocal: 2,
      golesVisitante: 1,
      jugadorDelPartido: { perfilId: 'perfil-1', nombreVisible: 'Juan' },
    };
    const { getByText } = render(<TarjetaActividad item={item} />);
    expect(getByText('⭐ Juan')).toBeTruthy();
  });

  it('un equipo que se sumó a un torneo', () => {
    const item: ItemActividadTarjeta = {
      tipo: 'team_joined_tournament',
      id: 'a-2',
      fecha: new Date().toISOString(),
      torneo: { id: 't-1', nombre: 'Copa Otoño', imagenUrl: null },
      equipo: { id: 'e-1', nombre: 'Los Pibes', escudoUrl: null },
    };
    const { getByText, getByRole } = render(<TarjetaActividad item={item} />);
    expect(getByRole('link')).toHaveAttribute('href', '/torneo/t-1');
    expect(getByText('se sumó a Copa Otoño', { exact: false })).toBeTruthy();
  });

  it.each([
    ['tournament_published', 'abrió inscripciones'],
    ['tournament_started', 'empezó a jugarse'],
    ['tournament_finished', 'terminó'],
  ] as const)('%s: muestra "%s"', (tipo, textoEsperado) => {
    const item: ItemActividadTarjeta = {
      tipo,
      id: 'a-3',
      fecha: new Date().toISOString(),
      torneo: { id: 't-1', nombre: 'Copa Otoño', imagenUrl: null },
    };
    const { getByText } = render(<TarjetaActividad item={item} />);
    expect(getByText(textoEsperado, { exact: false })).toBeTruthy();
  });
});
