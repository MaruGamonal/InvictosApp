// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EncabezadoTabla, FilaTabla } from './FilaTabla';

afterEach(() => cleanup());

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
        golesFavor={20}
        golesContra={5}
        diferenciaGol={15}
        puntos={25}
      />,
    );
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('muestra el nombre del equipo en la fila, no sólo el escudo (`08`, 11.4)', () => {
    const { getByRole } = render(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Deportivo Rivadavia' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        golesFavor={20}
        golesContra={5}
        diferenciaGol={15}
        puntos={25}
      />,
    );
    // Visible como texto de la celda, no escondido en un tooltip.
    expect(getByRole('rowheader')).toHaveTextContent('Deportivo Rivadavia');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra goles a favor y en contra en columnas propias (`08`, 11.4)', () => {
    const { getAllByRole } = render(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Equipo A' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        golesFavor={22}
        golesContra={7}
        diferenciaGol={15}
        puntos={25}
      />,
    );
    const celdas = getAllByRole('cell').map((celda) => celda.textContent);
    // #, PJ, G, E, P, GF, GC, DG, Aj., Pts — el equipo es el rowheader.
    expect(celdas).toEqual(['1', '10', '8', '1', '1', '22', '7', '+15', '—', '25']);
  });

  it('el encabezado tiene una celda por columna de la fila, en el mismo orden', () => {
    // Pasó: el título "Equipo" era sólo para lector de pantalla, con
    // `position: absolute`, y quedaba fuera de la grilla — todos los
    // títulos se corrían una columna y "Pts" quedaba sobre los ajustes.
    const { container } = render(
      <div>
        <EncabezadoTabla />
        <FilaTabla
          posicion={1}
          equipo={{ nombre: 'Equipo A' }}
          partidosJugados={10}
          ganados={8}
          empatados={1}
          perdidos={1}
          golesFavor={22}
          golesContra={7}
          diferenciaGol={15}
          puntos={25}
        />
      </div>,
    );
    const [encabezado, fila] = Array.from(container.querySelectorAll('[role="row"]'));
    const titulos = Array.from(encabezado!.children).map((celda) => celda.textContent);
    expect(titulos).toEqual(['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Aj.', 'Pts']);
    expect(fila!.children).toHaveLength(titulos.length);

    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'FilaTabla.module.css'),
      'utf8',
    );
    expect(css).not.toMatch(/position:\s*absolute/);
  });

  it('el ajuste de puntos va en su propia columna, nunca sumado a Pts (`06`, D-35b)', () => {
    const { getByText } = render(
      <FilaTabla
        posicion={3}
        equipo={{ nombre: 'Equipo B' }}
        partidosJugados={10}
        ganados={3}
        empatados={2}
        perdidos={5}
        golesFavor={20}
        golesContra={5}
        diferenciaGol={-2}
        puntos={11}
        ajustePuntos={-3}
      />,
    );
    expect(getByText('11')).toBeInTheDocument();
    expect(getByText('-3')).toBeInTheDocument();
  });

  it('sin ajuste de puntos, la columna muestra un guion en vez de 0', () => {
    const { getByText } = render(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Equipo A' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        golesFavor={20}
        golesContra={5}
        diferenciaGol={15}
        puntos={25}
      />,
    );
    expect(getByText('—')).toBeInTheDocument();
  });

  it('marca con asterisco los triunfos por presentación (`06`, D-33b)', () => {
    const { getByTitle, queryByTitle, rerender } = render(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Equipo A' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        golesFavor={20}
        golesContra={5}
        diferenciaGol={15}
        puntos={25}
      />,
    );
    expect(queryByTitle(/presentación/)).not.toBeInTheDocument();

    rerender(
      <FilaTabla
        posicion={1}
        equipo={{ nombre: 'Equipo A' }}
        partidosJugados={10}
        ganados={8}
        empatados={1}
        perdidos={1}
        golesFavor={20}
        golesContra={5}
        diferenciaGol={15}
        puntos={25}
        ganadosPorPresentacion={2}
      />,
    );
    expect(getByTitle('2 de esos triunfos son por presentación')).toHaveTextContent('*');
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
        golesFavor={20}
        golesContra={5}
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
