// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelInscripciones } from './PanelInscripciones';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe('PanelInscripciones', () => {
  it('muestra el contador de cupo con las aprobadas sobre el total', () => {
    const { getByText } = render(
      <PanelInscripciones
        torneoId="t-1"
        cupoEquipos={16}
        inscripciones={[
          { equipoId: 'e-1', nombreEquipo: 'A', estado: 'approved', advertenciaCategoria: false },
          { equipoId: 'e-2', nombreEquipo: 'B', estado: 'approved', advertenciaCategoria: false },
          { equipoId: 'e-3', nombreEquipo: 'C', estado: 'pending', advertenciaCategoria: false },
        ]}
      />,
    );
    expect(getByText('2 / 16 cupos ocupados')).toBeTruthy();
  });

  it('sin pendientes pero con confirmados, no muestra el estado vacío — solo la lista de confirmados', () => {
    const { getByText, queryByText } = render(
      <PanelInscripciones
        torneoId="t-1"
        cupoEquipos={16}
        inscripciones={[
          { equipoId: 'e-1', nombreEquipo: 'La Gloria', estado: 'approved', advertenciaCategoria: false },
        ]}
      />,
    );
    expect(queryByText('No hay inscripciones pendientes de resolver.')).not.toBeInTheDocument();
    expect(getByText('La Gloria')).toBeTruthy();
  });

  it('sin ninguna inscripción, muestra el estado vacío', () => {
    const { getByText } = render(
      <PanelInscripciones torneoId="t-1" cupoEquipos={16} inscripciones={[]} />,
    );
    expect(getByText('No hay inscripciones pendientes de resolver.')).toBeTruthy();
  });

  it('las resueltas se muestran sin botones de acción', () => {
    const { getByText, getAllByText } = render(
      <PanelInscripciones
        torneoId="t-1"
        cupoEquipos={16}
        inscripciones={[
          { equipoId: 'e-1', nombreEquipo: 'Pendiente FC', estado: 'pending', advertenciaCategoria: false },
          { equipoId: 'e-2', nombreEquipo: 'La Gloria', estado: 'approved', advertenciaCategoria: false },
        ]}
      />,
    );
    expect(getByText('Pendiente FC')).toBeTruthy();
    expect(getByText('La Gloria')).toBeTruthy();
    // Solo un botón Aprobar/Rechazar — el de la pendiente, no el de la resuelta.
    expect(getAllByText('Aprobar')).toHaveLength(1);
    expect(getAllByText('Rechazar')).toHaveLength(1);
  });

  it('separa confirmados (con check) de otras solicitudes resueltas (con badge)', () => {
    const { getByText, queryByText } = render(
      <PanelInscripciones
        torneoId="t-1"
        cupoEquipos={16}
        inscripciones={[
          { equipoId: 'e-1', nombreEquipo: 'La Gloria', estado: 'approved', advertenciaCategoria: false },
          { equipoId: 'e-2', nombreEquipo: 'Se Retiró FC', estado: 'rejected', advertenciaCategoria: false },
        ]}
      />,
    );
    expect(getByText('Equipos confirmados')).toBeTruthy();
    expect(getByText('· 1')).toBeTruthy();
    expect(getByText('La Gloria')).toBeTruthy();
    expect(getByText('Otras solicitudes')).toBeTruthy();
    expect(getByText('Se Retiró FC')).toBeTruthy();
    expect(getByText('Rechazada')).toBeTruthy();
    expect(queryByText('No hay inscripciones pendientes de resolver.')).not.toBeInTheDocument();
  });

  it('aprobar una pendiente llama a la API y refresca', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = render(
      <PanelInscripciones
        torneoId="t-1"
        cupoEquipos={16}
        inscripciones={[
          { equipoId: 'e-1', nombreEquipo: 'Pendiente FC', estado: 'pending', advertenciaCategoria: false },
        ]}
      />,
    );
    fireEvent.click(getByText('Aprobar'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/inscripciones/resolver',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ torneoId: 't-1', equipoId: 'e-1', decision: 'approved', motivo: undefined }),
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
