// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
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
});
