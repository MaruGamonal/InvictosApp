// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilaPartido } from './FilaPartido';

const equipos = {
  equipoLocal: { nombre: 'Equipo A' },
  equipoVisitante: { nombre: 'Equipo B' },
};

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

  it('variante programado: muestra la fecha en vez de un resultado', () => {
    render(<FilaPartido {...equipos} estado="scheduled" fechaProgramadaTexto="Sáb 14, 18:00" />);
    expect(screen.getByText('Sáb 14, 18:00')).toBeInTheDocument();
    expect(screen.getByText('Programado')).toBeInTheDocument();
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
    const hijos = Array.from(container.firstElementChild!.children);
    expect(hijos).toHaveLength(3);
    expect(hijos[1]!.textContent).toContain('1 - 1');
  });
});
