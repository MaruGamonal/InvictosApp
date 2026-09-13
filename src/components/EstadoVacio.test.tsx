// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EstadoVacio } from './EstadoVacio';

describe('EstadoVacio', () => {
  it('siempre muestra el mensaje explicativo', () => {
    render(<EstadoVacio mensaje="Todavía no hay torneos en tu ciudad." />);
    expect(screen.getByText('Todavía no hay torneos en tu ciudad.')).toBeInTheDocument();
  });

  it('cuando hay acción, la ofrece como paso siguiente en vez de dejar la lista sin salida', async () => {
    const onAccion = vi.fn();
    render(
      <EstadoVacio
        mensaje="Todavía no hay torneos en tu ciudad."
        textoAccion="Ver los de la provincia"
        onAccion={onAccion}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver los de la provincia' }));
    expect(onAccion).toHaveBeenCalledOnce();
  });

  it('con hrefAccion, la acción es un link — para usar desde páginas de servidor', () => {
    render(
      <EstadoVacio
        mensaje="Todavía no hay fixture generado para este torneo."
        textoAccion="Volver a la ficha"
        hrefAccion="/torneo/t-1"
      />,
    );
    const enlace = screen.getByRole('link', { name: 'Volver a la ficha' });
    expect(enlace).toHaveAttribute('href', '/torneo/t-1');
  });
});
