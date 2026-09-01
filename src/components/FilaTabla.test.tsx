// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilaTabla } from './FilaTabla';

describe('FilaTabla', () => {
  it('muestra los datos de la fila, con el signo de la diferencia de gol', () => {
    render(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Equipo A' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        diferenciaGol={15}
        puntos={25}
      />,
    );
    expect(screen.getByText('Equipo A')).toBeInTheDocument();
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('usa cifras tabulares en las columnas numéricas para que se alineen (`08`, sección 7)', () => {
    const { container } = render(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Equipo A' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        diferenciaGol={-3}
        puntos={25}
      />,
    );
    const aqui = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(aqui, 'FilaTabla.module.css'), 'utf8');
    expect(css).toMatch(/tabular-nums/);
    expect(container.textContent).toContain('-3');
  });
});
