// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SinProximoPartido } from './SinProximoPartido';

afterEach(() => cleanup());

const torneo = (estado: string) => ({ torneoId: 't-1', nombre: 'Copa Otoño F5', estado });

describe('el inicio sin próximo partido', () => {
  it('si juega un torneo en curso, dice que su partido no tiene fecha y lleva al fixture', () => {
    // Pasó: decía "descubrí otro torneo para tu equipo" a quien ya juega uno.
    render(<SinProximoPartido torneos={[torneo('in_progress')]} />);
    expect(screen.getByText('Tu próximo partido no tiene fecha')).toBeInTheDocument();
    expect(screen.getByText(/En Copa Otoño F5 todavía no se programó/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver el fixture' })).toHaveAttribute(
      'href',
      '/torneo/t-1/fixture',
    );
    expect(screen.queryByText(/descubrí otro torneo/)).not.toBeInTheDocument();
  });

  it('si su torneo todavía no empezó, lo dice y lleva a la ficha', () => {
    render(<SinProximoPartido torneos={[torneo('registration_closed')]} />);
    expect(screen.getByText('Tu torneo todavía no empezó')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver el torneo' })).toHaveAttribute(
      'href',
      '/torneo/t-1',
    );
  });

  it('si no juega ningún torneo vigente, invita a descubrir uno', () => {
    render(<SinProximoPartido torneos={[torneo('finished')]} />);
    expect(screen.getByText('Sin partido programado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Descubrir torneos' })).toHaveAttribute(
      'href',
      '/torneos',
    );
  });
});
