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
   * Revisión de UX: avisaba «Podés publicar sin definir el formato
   * todavía — solo hace falta antes de generar el fixture», o sea una
   * restricción de otra acción, en una pantalla donde todavía no se
   * está intentando esa acción. El bloqueo ya existe en el punto del
   * intento (`fixture/page.tsx`), con su salida a Configuración.
   */
  it('en borrador ofrece publicar, sin anticipar la restricción del fixture', () => {
    const { getByText, queryByText } = render(
      <AccionesEstadoTorneo
        torneoId="t-1"
        estado="draft"
        tieneFormatoDefinido={false}
        tienePartidos={false}
      />,
    );

    expect(getByText('Publicar torneo')).toBeTruthy();
    expect(queryByText(/definir el formato/)).toBeNull();
  });

  /**
   * Con las inscripciones cerradas y sin fixture, «Iniciar torneo» está
   * deshabilitado: el motivo va corto y pegado a la fila de botones, no
   * como una oración con referencia espacial («más abajo»).
   */
  it('sin partidos deshabilita iniciar y dice el motivo en una línea', () => {
    const { getByText } = render(
      <AccionesEstadoTorneo
        torneoId="t-1"
        estado="registration_closed"
        tieneFormatoDefinido
        tienePartidos={false}
      />,
    );

    expect(getByText('Falta confirmar el fixture.')).toBeTruthy();
    expect((getByText('Iniciar torneo') as HTMLButtonElement).disabled).toBe(true);
  });

  it('con partidos habilita iniciar y no muestra el motivo', () => {
    const { getByText, queryByText } = render(
      <AccionesEstadoTorneo
        torneoId="t-1"
        estado="registration_closed"
        tieneFormatoDefinido
        tienePartidos
      />,
    );

    expect(queryByText('Falta confirmar el fixture.')).toBeNull();
    expect((getByText('Iniciar torneo') as HTMLButtonElement).disabled).toBe(false);
  });
});
