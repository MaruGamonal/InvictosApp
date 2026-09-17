// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { BloqueSeguimiento } from './BloqueSeguimiento';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BloqueSeguimiento', () => {
  it('muestra la cantidad aparte del botón, y las acciones extra en la fila', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );

    const { getByText, getByRole } = render(
      <BloqueSeguimiento
        tipoSeguido="team"
        entidadId="e-1"
        cantidadSeguidoresInicial={5}
        claseCantidad="cantidad"
        claseAcciones="acciones"
        accionesExtra={<button type="button">Pedir sumarme</button>}
      >
        <span>Masculino · San Isidro</span>
      </BloqueSeguimiento>,
    );

    expect(getByText('5 seguidores')).toBeTruthy();
    expect(getByText('Masculino · San Isidro')).toBeTruthy();
    expect(getByRole('button', { name: 'Seguir' })).toBeTruthy();
    expect(getByRole('button', { name: 'Pedir sumarme' })).toBeTruthy();
  });

  it('al seguir, la cantidad mostrada aparte sube en 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );

    const { getByText, getByRole } = render(
      <BloqueSeguimiento
        tipoSeguido="tournament"
        entidadId="t-1"
        cantidadSeguidoresInicial={5}
        claseCantidad="cantidad"
        claseAcciones="acciones"
      />,
    );

    expect(getByText('5 seguidores')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Seguir' }));
    await waitFor(() => expect(getByText('6 seguidores')).toBeTruthy());
  });
});
