// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AccionesEstadoTorneo } from './AccionesEstadoTorneo';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/components/avisos/Avisos', () => ({
  useAvisos: () => ({ cargando: vi.fn(), exito: vi.fn(), error: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe('AccionesEstadoTorneo', () => {
  /**
   * Publicar salió de acá: vive en el Resumen, donde se lo ve. En
   * borrador este panel no tiene ninguna otra acción que ofrecer, así
   * que no renderiza nada en vez de dejar un acordeón que se abre
   * vacío.
   */
  it('en borrador no renderiza nada: publicar ya no vive acá', () => {
    const { container, queryByText } = render(
      <AccionesEstadoTorneo torneoId="t-1" estado="draft" tienePartidos={false} />,
    );

    expect(queryByText('Publicar torneo')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it.each(['finished', 'cancelled'])('en %s tampoco renderiza nada', (estado) => {
    const { container } = render(
      <AccionesEstadoTorneo torneoId="t-1" estado={estado} tienePartidos={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  /**
   * Con las inscripciones cerradas y sin fixture, «Iniciar torneo» está
   * deshabilitado: el motivo va corto y pegado a la fila de botones, no
   * como una oración con referencia espacial («más abajo»).
   */
  it('sin partidos deshabilita iniciar y dice el motivo en una línea', () => {
    const { getByText } = render(
      <AccionesEstadoTorneo torneoId="t-1" estado="registration_closed" tienePartidos={false} />,
    );

    expect(getByText('Falta confirmar el fixture.')).toBeTruthy();
    expect((getByText('Iniciar torneo') as HTMLButtonElement).disabled).toBe(true);
  });

  it('con partidos habilita iniciar y no muestra el motivo', () => {
    const { getByText, queryByText } = render(
      <AccionesEstadoTorneo torneoId="t-1" estado="registration_closed" tienePartidos />,
    );

    expect(queryByText('Falta confirmar el fixture.')).toBeNull();
    expect((getByText('Iniciar torneo') as HTMLButtonElement).disabled).toBe(false);
  });

  describe('finalizar el torneo', () => {
    // Pasó: era el botón principal y finalizaba con un toque, también con
    // partidos sin jugar. Finalizar no se puede deshacer.
    it('con partidos pendientes, no es la acción principal y pide confirmación con lo que se pierde', () => {
      const fetchFalso = vi.fn();
      vi.stubGlobal('fetch', fetchFalso);
      render(
        <AccionesEstadoTorneo
          torneoId="t-1"
          estado="in_progress"
          tienePartidos
          partidosPendientes={5}
        />,
      );
      const finalizar = screen.getByRole('button', { name: 'Finalizar torneo' });
      expect(finalizar.className).toMatch(/botonSecundarioChico/);

      fireEvent.click(finalizar);
      expect(fetchFalso).not.toHaveBeenCalled();
      expect(screen.getByText(/Quedan 5 partidos sin jugar/)).toBeInTheDocument();
      expect(screen.getByText(/No se puede deshacer/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
      expect(screen.getByRole('button', { name: 'Finalizar torneo' })).toBeInTheDocument();
    });

    it('sin partidos pendientes, lo sugiere (D-23b) y confirma antes de enviar', async () => {
      const fetchFalso = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: {} })));
      vi.stubGlobal('fetch', fetchFalso);
      render(
        <AccionesEstadoTorneo
          torneoId="t-1"
          estado="in_progress"
          tienePartidos
          partidosPendientes={0}
        />,
      );
      expect(screen.getByText(/Ya se jugaron todos los partidos/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Finalizar torneo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));
      expect(fetchFalso).toHaveBeenCalledOnce();
      const [, opciones] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit];
      expect(JSON.parse(String(opciones.body))).toEqual({
        torneoId: 't-1',
        estadoDestino: 'finished',
      });
    });
  });
});
