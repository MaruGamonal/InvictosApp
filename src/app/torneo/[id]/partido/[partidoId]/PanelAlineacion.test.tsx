// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelAlineacion } from './PanelAlineacion';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const LOCAL = { id: 'eq-local', nombre: 'Deportivo Pichincha' };
const VISITANTE = { id: 'eq-visita', nombre: 'Atlético Garupá' };

const HABILITADOS = [
  { perfilId: 'p-1', nombreVisible: 'Lucía Fernández', equipoId: LOCAL.id, numeroCamiseta: 10 },
  { perfilId: 'p-2', nombreVisible: 'Ana Suárez', equipoId: LOCAL.id, numeroCamiseta: null },
  { perfilId: 'p-3', nombreVisible: 'Mora Díaz', equipoId: VISITANTE.id, numeroCamiseta: 7 },
];

function montar(props: Partial<Parameters<typeof PanelAlineacion>[0]> = {}) {
  return render(
    <PanelAlineacion
      partidoId="pa-1"
      version={3}
      golesLocal={2}
      golesVisitante={1}
      local={LOCAL}
      visitante={VISITANTE}
      alineacion={[]}
      habilitados={[]}
      puedeCargar={false}
      {...props}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe('PanelAlineacion', () => {
  /** Sin alineación y sin poder cargarla no hay nada que decir. */
  it('no renderiza nada si no hay alineación y quien mira no puede cargarla', () => {
    const { container } = montar();
    expect(container.innerHTML).toBe('');
  });

  it('en sólo lectura muestra quiénes jugaron, agrupados por equipo', () => {
    const { getByText, queryByRole } = montar({
      alineacion: [
        { perfilId: 'p-1', nombreVisible: 'Lucía Fernández', equipoId: LOCAL.id, fueTitular: true },
        { perfilId: 'p-3', nombreVisible: 'Mora Díaz', equipoId: VISITANTE.id, fueTitular: false },
      ],
    });

    expect(getByText('Quiénes jugaron')).toBeTruthy();
    expect(getByText('Deportivo Pichincha')).toBeTruthy();
    expect(getByText('Lucía Fernández')).toBeTruthy();
    // Quien entró desde el banco se distingue, pero jugó igual.
    expect(getByText('entró')).toBeTruthy();
    expect(queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('sin alineación todavía, a quien puede cargarla le ofrece hacerlo', () => {
    const { getByText, getByRole } = montar({ puedeCargar: true, habilitados: HABILITADOS });
    expect(getByText('Todavía no se cargó quiénes jugaron.')).toBeTruthy();
    expect(getByRole('button', { name: 'Cargar' })).toBeTruthy();
  });

  /**
   * El marcador viaja tal cual está: esta pantalla no lo cambia, y
   * `version` es lo que impide pisar una carga de otro.
   */
  it('guarda la alineación mandando el marcador y la versión que ya tenía', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByLabelText } = montar({ puedeCargar: true, habilitados: HABILITADOS });
    fireEvent.click(getByRole('button', { name: 'Cargar' }));

    fireEvent.click(getByLabelText(/Lucía Fernández/));
    fireEvent.click(getByLabelText(/Mora Díaz/));
    fireEvent.click(getByRole('button', { name: 'Guardar alineación' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo).toMatchObject({
      partidoId: 'pa-1',
      version: 3,
      golesLocal: 2,
      golesVisitante: 1,
    });
    expect(cuerpo.alineaciones).toEqual([
      { perfilId: 'p-1', equipoId: LOCAL.id, fueTitular: true },
      { perfilId: 'p-3', equipoId: VISITANTE.id, fueTitular: true },
    ]);
    expect(refresh).toHaveBeenCalled();
  });

  it('marcar a alguien como que entró lo manda con fueTitular en false', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByLabelText } = montar({ puedeCargar: true, habilitados: HABILITADOS });
    fireEvent.click(getByRole('button', { name: 'Cargar' }));
    fireEvent.click(getByLabelText(/Ana Suárez/));
    fireEvent.click(getByRole('radio', { name: 'Entró' }));
    fireEvent.click(getByRole('button', { name: 'Guardar alineación' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.alineaciones).toEqual([
      { perfilId: 'p-2', equipoId: LOCAL.id, fueTitular: false },
    ]);
  });

  /** Vaciarla es una operación válida: reemplaza por completo la anterior. */
  it('destildar a todos manda una alineación vacía, que es lo que la borra', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByRole, getByLabelText } = montar({
      puedeCargar: true,
      habilitados: HABILITADOS,
      alineacion: [
        { perfilId: 'p-1', nombreVisible: 'Lucía Fernández', equipoId: LOCAL.id, fueTitular: true },
      ],
    });
    fireEvent.click(getByRole('button', { name: 'Editar' }));
    fireEvent.click(getByLabelText(/Lucía Fernández/));
    fireEvent.click(getByRole('button', { name: 'Guardar alineación' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.alineaciones).toEqual([]);
  });

  it('un equipo sin lista de buena fe lo dice en vez de mostrar una lista vacía', () => {
    const { getByText } = montar({
      puedeCargar: true,
      habilitados: HABILITADOS.filter((j) => j.equipoId === LOCAL.id),
    });
    fireEvent.click(getByText('Cargar'));
    expect(getByText('Este equipo todavía no cargó su lista de buena fe.')).toBeTruthy();
  });

  it('si el servidor rechaza, lo dice y no cierra el formulario', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: { mensaje: 'El partido cambió mientras tanto.' } }),
      }),
    );

    const { getByRole, getByLabelText, getByText } = montar({
      puedeCargar: true,
      habilitados: HABILITADOS,
    });
    fireEvent.click(getByRole('button', { name: 'Cargar' }));
    fireEvent.click(getByLabelText(/Lucía Fernández/));
    fireEvent.click(getByRole('button', { name: 'Guardar alineación' }));

    await waitFor(() => expect(getByText('El partido cambió mientras tanto.')).toBeTruthy());
    expect(getByRole('button', { name: 'Guardar alineación' })).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
