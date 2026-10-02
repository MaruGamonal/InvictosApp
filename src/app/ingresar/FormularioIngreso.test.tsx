// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { FormularioIngreso } from './FormularioIngreso';

const assign = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  assign.mockClear();
});

describe('FormularioIngreso', () => {
  it('en modo ingresar, muestra "Recordarme" marcado por default', () => {
    const { getByLabelText } = render(<FormularioIngreso modoInicial="ingresar" />);
    const checkbox = getByLabelText('Recordarme') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('en modo crear cuenta, no muestra "Recordarme"', () => {
    const { queryByLabelText } = render(<FormularioIngreso modoInicial="crear" />);
    expect(queryByLabelText('Recordarme')).toBeNull();
  });

  it('al ingresar, manda "recordarme" en el body según el checkbox', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window.location, 'assign').mockImplementation(assign);

    const { getByLabelText, getByRole } = render(<FormularioIngreso modoInicial="ingresar" />);
    fireEvent.change(getByLabelText('Correo'), { target: { value: 'vos@example.com' } });
    fireEvent.change(getByLabelText('Contraseña'), { target: { value: 'contraseñaSegura123' } });
    fireEvent.click(getByLabelText('Recordarme'));
    fireEvent.click(getByRole('button', { name: 'Ingresar' }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(cuerpo.recordarme).toBe(false);
  });

  /**
   * Punto 10. `inscribir` no tiene ejecutor a propósito: el redirect
   * ocurre antes de elegir equipo, y quien se acaba de registrar no
   * tiene ninguno. Lo que se retoma es el lugar.
   */
  it('con una inscripción pendiente vuelve al torneo con el panel abierto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window.location, 'assign').mockImplementation(assign);

    const { getByLabelText, getByRole } = render(
      <FormularioIngreso
        modoInicial="ingresar"
        accionPendiente={{ tipo: 'inscribir', torneoId: 't-9' }}
      />,
    );
    fireEvent.change(getByLabelText('Correo'), { target: { value: 'vos@example.com' } });
    fireEvent.change(getByLabelText('Contraseña'), { target: { value: 'contraseñaSegura123' } });
    fireEvent.click(getByRole('button', { name: 'Ingresar' }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/torneo/t-9?inscribir=1'));
    // No se inscribe nada acá: todavía no hay equipo elegido.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/ingresar');
  });

  /** `seguir` sí se ejecuta sola: no hay nada más que preguntar. */
  it('con un seguimiento pendiente lo ejecuta y vuelve a la entidad', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window.location, 'assign').mockImplementation(assign);

    const { getByLabelText, getByRole } = render(
      <FormularioIngreso
        modoInicial="ingresar"
        accionPendiente={{ tipo: 'seguir', tipoSeguido: 'tournament', entidadId: 't-3' }}
      />,
    );
    fireEvent.change(getByLabelText('Correo'), { target: { value: 'vos@example.com' } });
    fireEvent.change(getByLabelText('Contraseña'), { target: { value: 'contraseñaSegura123' } });
    fireEvent.click(getByRole('button', { name: 'Ingresar' }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/torneo/t-3'));
    expect(fetchMock).toHaveBeenCalledWith('/api/seguir', expect.anything());
  });

  it('en modo crear cuenta, con menos de 8 caracteres el botón queda deshabilitado', () => {
    const { getByLabelText, getByRole, getByText } = render(
      <FormularioIngreso modoInicial="crear" />,
    );
    fireEvent.change(getByLabelText('Nombre visible'), { target: { value: 'Vale' } });
    fireEvent.change(getByLabelText('Correo'), { target: { value: 'vos@example.com' } });
    fireEvent.change(getByLabelText('Contraseña'), { target: { value: '1234567' } });

    expect(getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(getByText('Todavía le faltan caracteres — mínimo 8.')).toBeTruthy();
  });

  it('en modo crear cuenta, con 8 caracteres o más el botón se habilita', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window.location, 'assign').mockImplementation(assign);

    const { getByLabelText, getByRole } = render(<FormularioIngreso modoInicial="crear" />);
    fireEvent.change(getByLabelText('Nombre visible'), { target: { value: 'Vale' } });
    fireEvent.change(getByLabelText('Correo'), { target: { value: 'vos@example.com' } });
    fireEvent.change(getByLabelText('Contraseña'), { target: { value: 'contraseñaSegura123' } });

    const boton = getByRole('button', { name: 'Crear cuenta' });
    expect(boton).not.toBeDisabled();
    fireEvent.click(boton);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
