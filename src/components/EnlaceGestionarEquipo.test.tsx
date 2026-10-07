// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { EnlaceGestionarEquipo } from './EnlaceGestionarEquipo';

function responderCon(roles: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { roles } }) }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EnlaceGestionarEquipo', () => {
  it('sin vínculo con el equipo no muestra nada', async () => {
    responderCon([]);
    const { container } = render(<EnlaceGestionarEquipo equipoId="e-1" />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it.each(['captain', 'delegate'])('a quien gestiona (%s) le ofrece gestionar', async (rol) => {
    responderCon([rol, 'player']);
    const { findByRole } = render(<EnlaceGestionarEquipo equipoId="e-1" />);
    const enlace = await findByRole('link', { name: 'Gestionar equipo' });
    expect(enlace).toHaveAttribute('href', '/equipo/e-1/gestionar');
  });

  /**
   * Reportado en vivo: a un jugador se le ofrecía "Gestionar equipo" y
   * del otro lado encontraba el plantel con una × al lado de su nombre.
   * No gestiona nada: lo único que puede hacer ahí es irse.
   */
  it.each(['player', 'coach'])(
    'a quien no gestiona (%s) le ofrece dejar el equipo',
    async (rol) => {
      responderCon([rol]);
      const { findByRole, queryByRole } = render(<EnlaceGestionarEquipo equipoId="e-1" />);
      await findByRole('link', { name: 'Dejar equipo' });
      expect(queryByRole('link', { name: 'Gestionar equipo' })).toBeNull();
    },
  );
});
