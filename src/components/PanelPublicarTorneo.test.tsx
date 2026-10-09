// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { PanelPublicarTorneo, type PanelPublicarTorneoProps } from './PanelPublicarTorneo';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock('@/components/avisos/Avisos', () => ({
  useAvisos: () => ({ cargando: vi.fn(), exito: vi.fn(), error: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

function montar(extra: Partial<PanelPublicarTorneoProps> = {}) {
  const props: PanelPublicarTorneoProps = {
    torneoId: 't-1',
    organizacionId: 'o-1',
    soyTitular: true,
    organizacionVerificada: true,
    limitePublicadosAlcanzado: false,
    camposFaltantes: [],
    destinoAlPublicar: '/torneo/t-1/gestionar',
    ...extra,
  };
  return render(<PanelPublicarTorneo {...props} />);
}

describe('PanelPublicarTorneo', () => {
  it('al publicar, llama a la API y navega al destino', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText } = montar();
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/torneos/publicar',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ torneoId: 't-1' }) }),
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/torneo/t-1/gestionar'));
  });

  /**
   * En el Resumen de la gestión no hay adónde ir: ya se está ahí. Antes
   * este panel solo sabía navegar, porque solo existía como último paso
   * del alta.
   */
  it('sin destino, refresca en vez de navegar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }),
    );

    const { getByText } = montar({ destinoAlPublicar: undefined });
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it('si publicar falla, muestra el error y no navega', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: { mensaje: 'No se pudo.' } }),
      }),
    );

    const { getByText } = montar();
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(getByText('No se pudo.')).toBeTruthy());
    expect(push).not.toHaveBeenCalled();
  });
});

/**
 * Lo que falta para publicar se sabía recién **después** de que el
 * intento fallara, que es el peor momento para enterarse de que había
 * que ir a Configuración. Ahora el dato llega con la pantalla.
 */
describe('PanelPublicarTorneo — datos mínimos que faltan', () => {
  it('los lista antes de intentar, enlaza a Configuración y no deja publicar', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, getByRole } = montar({
      camposFaltantes: ['dirección', 'fecha estimada de inicio'],
    });

    expect(getByText('dirección')).toBeTruthy();
    expect(getByText('fecha estimada de inicio')).toBeTruthy();
    expect(getByRole('link', { name: 'Completar los datos del torneo' })).toHaveAttribute(
      'href',
      // Derecho a la sección donde se cargan, no al menú: los datos
      // mínimos que pueden faltar viven todos en "Datos del torneo".
      '/torneo/t-1/gestionar/configuracion/datos',
    );

    const boton = getByText('Publicar torneo') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    fireEvent.click(boton);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /** El servidor decide: si rechaza por datos faltantes, esos ganan. */
  it('si el servidor rechaza por datos faltantes, muestra los suyos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: {
            codigo: 'DATOS_MINIMOS_INCOMPLETOS',
            mensaje: 'Para publicar el torneo todavía falta completar algunos datos.',
            detalle: [
              { campo: 'cupo de equipos', problema: 'Falta para poder publicar el torneo.' },
            ],
          },
        }),
      }),
    );

    const { getByText } = montar();
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(getByText('cupo de equipos')).toBeTruthy());
    expect((getByText('Publicar torneo') as HTMLButtonElement).disabled).toBe(true);
  });
});

/**
 * En el Resumen el botón se va a una barra fija abajo: arriba hay una
 * explicación, el aviso de verificación y, si falta algo, la lista de
 * datos pendientes, y publicar tiene que estar siempre a un toque. El
 * último paso del alta no la usa — es una tarjeta corta y centrada.
 */
describe('PanelPublicarTorneo — con la acción fija', () => {
  it('el botón sigue siendo uno solo, con el mismo estado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const { getAllByRole, getByText } = montar({ accionFija: true });
    expect(getAllByRole('button', { name: 'Publicar torneo' })).toHaveLength(1);

    fireEvent.click(getByText('Publicar torneo'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  /**
   * Por qué el botón está apagado, al lado del botón. Va el número y no
   * la lista: la lista completa está en el panel, y repetirla entera
   * sería leer dos veces lo mismo cuando las dos cosas entran juntas.
   */
  it('dice cuántos datos faltan junto a la acción, sin repetir la lista', () => {
    const { getByText, queryByText } = montar({
      accionFija: true,
      camposFaltantes: ['dirección', 'fecha estimada de inicio'],
    });
    expect(getByText('Faltan 2 datos para publicar')).toBeTruthy();
    expect(queryByText(/Falta cargar: dirección, fecha/)).toBeNull();
    expect((getByText('Publicar torneo') as HTMLButtonElement).disabled).toBe(true);
  });

  it('con un solo dato faltante, lo dice en singular', () => {
    const { getByText } = montar({ accionFija: true, camposFaltantes: ['dirección'] });
    expect(getByText('Falta 1 dato para publicar')).toBeTruthy();
  });

  it('sin la acción fija, el botón va dentro del panel y no hay nota', () => {
    const { getAllByRole, queryByText } = montar({ camposFaltantes: ['dirección'] });
    expect(getAllByRole('button', { name: 'Publicar torneo' })).toHaveLength(1);
    expect(queryByText(/para publicar$/)).toBeNull();
  });
});

describe('PanelPublicarTorneo — sin verificar (D-51)', () => {
  /** La noticia y la salida juntas, antes de publicar. */
  it('avisa que el torneo no va a aparecer en las búsquedas y ofrece verificar', () => {
    const { getByText, getByRole } = montar({ organizacionVerificada: false });

    expect(getByText(/no aparece en las búsquedas/)).toBeTruthy();
    expect(getByRole('button', { name: 'Verificar ahora' })).toBeTruthy();
  });

  it('con el límite alcanzado lo dice en vez del aviso general', () => {
    const { getByText, queryByText } = montar({
      organizacionVerificada: false,
      limitePublicadosAlcanzado: true,
    });

    expect(getByText(/Ya tenés un torneo publicado/)).toBeTruthy();
    expect(queryByText(/el torneo se comparte por enlace/)).toBeNull();
  });

  /**
   * Publicar sin verificar no falla: el torneo nace no listado. La
   * pantalla tiene que decirlo acá, no irse sin avisar.
   */
  it('si el torneo quedó no listado, lo explica y ofrece verificar en vez de navegar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: { visibilidad: 'unlisted', motivoNoListado: 'organizacion_no_verificada' },
        }),
      }),
    );

    const { getByText, getByRole } = montar({ organizacionVerificada: false });
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(getByText(/Tu torneo está publicado/)).toBeTruthy());
    expect(getByText(/no aparece en las búsquedas/)).toBeTruthy();
    expect(getByRole('button', { name: 'Verificar ahora' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * Quien no es Titular no puede pedirla: no se le ofrece, y tampoco se
   * le explica el permiso. La noticia sí le sirve y se queda.
   */
  it('a quien no es Titular le da la noticia, sin botón ni explicación del permiso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { motivoNoListado: 'organizacion_no_verificada' } }),
      }),
    );

    const { getByText, queryByRole, queryByText } = montar({
      organizacionVerificada: false,
      soyTitular: false,
    });
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(getByText(/Tu torneo está publicado/)).toBeTruthy());
    expect(queryByRole('button', { name: 'Verificar ahora' })).toBeNull();
    expect(queryByText(/La verificación la pide/)).toBeNull();
  });

  /** El límite de un torneo publicado se levanta verificando: la salida va ahí. */
  it('si choca con el límite de torneos publicados, ofrece verificar junto al error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: {
            codigo: 'LIMITE_TORNEOS_PUBLICADOS',
            mensaje:
              'Mientras tu organización no esté verificada, podés tener un solo torneo publicado a la vez.',
          },
        }),
      }),
    );

    const { getByText, getByRole } = montar();
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(getByText(/un solo torneo publicado a la vez/)).toBeTruthy());
    expect(getByRole('button', { name: 'Verificar ahora' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  /** Un error cualquiera no tiene nada que ver con verificar. */
  it('con un error que no es el límite, no ofrece verificar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: { codigo: 'NO_ENCONTRADO', mensaje: 'No existe.' },
        }),
      }),
    );

    const { getByText, queryByRole } = montar();
    fireEvent.click(getByText('Publicar torneo'));

    await waitFor(() => expect(getByText('No existe.')).toBeTruthy());
    expect(queryByRole('button', { name: 'Verificar ahora' })).toBeNull();
  });
});
