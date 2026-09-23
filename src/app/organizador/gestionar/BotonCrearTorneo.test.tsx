// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ProveedorAvisos } from '@/components/avisos/Avisos';
import { BotonCrearTorneo } from './BotonCrearTorneo';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockClear();
});

function montar(bloqueado: boolean) {
  return render(
    <ProveedorAvisos>
      <BotonCrearTorneo bloqueado={bloqueado} />
    </ProveedorAvisos>,
  );
}

describe('BotonCrearTorneo', () => {
  it('sin bloqueo, lleva a crear el torneo', () => {
    const { getByRole } = montar(false);
    fireEvent.click(getByRole('button', { name: '+ Crear torneo' }));
    expect(push).toHaveBeenCalledWith('/torneo/crear');
  });

  /**
   * El botón no desaparece: uno escondido no explica nada, y la
   * pregunta ("¿por qué no puedo crear un torneo?") se queda sin
   * respuesta.
   */
  it('bloqueado, sigue a la vista y NO navega', () => {
    const { getByRole } = montar(true);
    const boton = getByRole('button', { name: '+ Crear torneo' });

    expect(boton.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(boton);
    expect(push).not.toHaveBeenCalled();
  });

  it('bloqueado, explica el motivo y ofrece ver la organización', () => {
    const { getByRole, getByText } = montar(true);
    fireEvent.click(getByRole('button', { name: '+ Crear torneo' }));

    expect(getByText('Verificá tu organización para crear otros torneos.')).toBeTruthy();

    fireEvent.click(getByRole('button', { name: 'Ver organización' }));
    expect(push).toHaveBeenCalledWith('/organizador/gestionar/perfil');
  });

  /** Un aviso que se va solo deja la pregunta sin responder otra vez. */
  it('el aviso del bloqueo no se va solo', () => {
    vi.useFakeTimers();
    const { getByRole, getByText } = montar(true);
    fireEvent.click(getByRole('button', { name: '+ Crear torneo' }));
    vi.advanceTimersByTime(60_000);
    expect(getByText('Verificá tu organización para crear otros torneos.')).toBeTruthy();
    vi.useRealTimers();
  });
});
