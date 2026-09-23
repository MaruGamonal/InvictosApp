// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { olvidarSesionConsultada } from '@/lib/sesionDelCliente';
import { NavInferior } from './NavInferior';
import { useSesion } from './useSesion';

function Sonda() {
  const autenticado = useSesion();
  return <span data-testid="estado">{String(autenticado)}</span>;
}

beforeEach(() => olvidarSesionConsultada());

afterEach(() => {
  cleanup();
  olvidarSesionConsultada();
  vi.unstubAllGlobals();
});

describe('useSesion', () => {
  /**
   * El origen del delay: cada componente pedía lo suyo, y había tres en
   * pantalla (nav, campanita, enlace de ingreso). Reportado en vivo.
   */
  it('tres componentes a la vez hacen UN solo pedido', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <>
        <Sonda />
        <Sonda />
        <Sonda />
      </>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/mi-usuario');
  });

  it('con sesión responde true, sin sesión false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const conSesion = render(<Sonda />);
    await waitFor(() => expect(conSesion.getByTestId('estado').textContent).toBe('true'));

    cleanup();
    olvidarSesionConsultada();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const sinSesion = render(<Sonda />);
    await waitFor(() => expect(sinSesion.getByTestId('estado').textContent).toBe('false'));
  });

  /**
   * El otro origen del delay: al cambiar de pantalla los componentes se
   * vuelven a montar y volvían a esperar. Ahora arrancan con lo
   * recordado, así que el nav ya está en el primer render.
   */
  it('al volver a montar arranca con la respuesta recordada, sin esperar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const primera = render(<Sonda />);
    await waitFor(() => expect(primera.getByTestId('estado').textContent).toBe('true'));
    cleanup();

    // Otra pantalla: el módulo se "recarga" pero el navegador recuerda.
    olvidarSesionConsultadaSinBorrarLoRecordado();
    const segunda = render(<NavInferior activo="inicio" />);
    expect(segunda.container.querySelector('nav')).toBeTruthy();
  });

  /** Un corte de red no es una respuesta: no se recuerda como "no hay sesión". */
  it('si el pedido falla, no se guarda nada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    const { getByTestId } = render(<Sonda />);
    await waitFor(() => expect(getByTestId('estado').textContent).toBe('false'));
    expect(sessionStorage.getItem('sesion_activa')).toBeNull();
  });
});

describe('NavInferior', () => {
  /**
   * El camino rápido: en `/inicio`, `/perfil` y `/notificaciones` el
   * servidor ya exigió sesión, así que el nav sale con la página.
   */
  it('con `autenticado` del servidor dibuja en el primer render y no pregunta', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<NavInferior activo="inicio" autenticado />);

    expect(container.querySelector('nav')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /** Sin sesión sigue oculto: un visitante no ve un nav de cuenta. */
  it('sin sesión no se dibuja', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { container } = render(<NavInferior activo="torneos" />);
    await waitFor(() => expect(container.querySelector('nav')).toBeNull());
  });

  it('en una pantalla pública, con sesión termina apareciendo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const { container } = render(<NavInferior activo="torneos" />);
    await waitFor(() => expect(container.querySelector('nav')).toBeTruthy());
  });
});

/** Simula cambiar de pantalla: se pierde la promesa, no lo recordado. */
function olvidarSesionConsultadaSinBorrarLoRecordado() {
  const recordado = sessionStorage.getItem('sesion_activa');
  olvidarSesionConsultada();
  if (recordado !== null) sessionStorage.setItem('sesion_activa', recordado);
}
