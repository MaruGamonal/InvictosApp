// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FilaPartido } from './FilaPartido';

const equipos = {
  equipoLocal: { nombre: 'Equipo A' },
  equipoVisitante: { nombre: 'Equipo B' },
};

afterEach(() => cleanup());

describe('FilaPartido', () => {
  it('variante jugado: muestra el resultado y el badge "Jugado"', () => {
    render(<FilaPartido {...equipos} estado="played" golesLocal={2} golesVisitante={1} />);
    expect(screen.getByText('2 - 1')).toBeInTheDocument();
    expect(screen.getByText('Jugado')).toBeInTheDocument();
  });

  it('variante ganado por presentación: se distingue de "jugado" con su propio badge', () => {
    render(<FilaPartido {...equipos} estado="walkover" golesLocal={3} golesVisitante={0} />);
    expect(screen.getByText('3 - 0')).toBeInTheDocument();
    expect(screen.getByText('Ganado por presentación')).toBeInTheDocument();
  });

  it('variante programado: "vs" en el centro y la fecha en la línea de abajo', () => {
    const { container } = render(
      <FilaPartido {...equipos} estado="scheduled" fechaProgramadaTexto="Sáb 14, 18:00" />,
    );
    const [, centro, , datos] = Array.from(container.firstElementChild!.children);
    expect(centro!.textContent).toBe('vs');
    expect(datos!.textContent).toContain('Programado');
    expect(datos!.textContent).toContain('Sáb 14, 18:00');
  });

  it('variante suspendido: no muestra resultado', () => {
    render(<FilaPartido {...equipos} estado="postponed" />);
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getByText('Suspendido')).toBeInTheDocument();
  });

  it('el resultado queda centrado entre los dos equipos', () => {
    const { container } = render(
      <FilaPartido {...equipos} estado="played" golesLocal={1} golesVisitante={1} />,
    );
    const [local, centro, visitante] = Array.from(container.firstElementChild!.children);
    expect(local!.textContent).toContain('Equipo A');
    expect(centro!.textContent).toBe('1 - 1');
    expect(visitante!.textContent).toContain('Equipo B');
  });

  it('en el fixture, un partido sin programar lo dice en vez de quedar en "vs" a secas', () => {
    render(<FilaPartido {...equipos} estado="unscheduled" conLineaDeDatos />);
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getByText('Sin fecha todavía')).toBeInTheDocument();
  });

  it('un partido jugado muestra abajo día, hora y sede (`08`, 11.4)', () => {
    render(
      <FilaPartido
        {...equipos}
        estado="played"
        golesLocal={2}
        golesVisitante={1}
        fechaProgramadaTexto="sáb 14 nov, 18:00"
        sedeNombre="Complejo El Potrero"
        conLineaDeDatos
      />,
    );
    expect(screen.getByText('sáb 14 nov, 18:00 · Complejo El Potrero')).toBeInTheDocument();
  });

  it('la fecha aparece una sola vez, junto a la sede', () => {
    render(
      <FilaPartido
        {...equipos}
        estado="scheduled"
        fechaProgramadaTexto="Sáb 14, 18:00"
        sedeNombre="Cancha 2"
        conLineaDeDatos
      />,
    );
    expect(screen.getAllByText(/Sáb 14, 18:00/)).toHaveLength(1);
    expect(screen.getByText('Sáb 14, 18:00 · Cancha 2')).toBeInTheDocument();
  });

  it('un partido que se movió lo dice, con la fecha de antes (`06`, D-30)', () => {
    render(
      <FilaPartido
        {...equipos}
        estado="scheduled"
        fechaProgramadaTexto="Dom 15, 10:00"
        fechaOriginalTexto="Sáb 14, 18:00"
        conLineaDeDatos
      />,
    );
    expect(screen.getByText('Se movió · antes era Sáb 14, 18:00')).toBeInTheDocument();
  });

  it('fuera del fixture, sin datos extra, la fila queda en sus tres partes', () => {
    const { container } = render(<FilaPartido {...equipos} estado="unscheduled" />);
    expect(container.firstElementChild!.children).toHaveLength(3);
    expect(screen.queryByText('Sin fecha todavía')).not.toBeInTheDocument();
  });
});
