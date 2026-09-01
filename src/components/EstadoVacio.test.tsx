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
});
