// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { ListaPlantelPublico } from './ListaPlantelPublico';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const INTEGRANTES = [
  {
    perfilId: 'perfil-1',
    nombreVisible: 'Ana',
    fotoUrl: null,
    posicion: null,
    rolesEquipo: ['captain' as const],
  },
  {
    perfilId: 'perfil-2',
    nombreVisible: 'Bruno',
    fotoUrl: null,
    posicion: null,
    rolesEquipo: ['player' as const],
  },
];

describe('ListaPlantelPublico', () => {
  it('sin sesión (o sin vínculo), ninguna fila se marca "(vos)"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { roles: [], perfilId: null } }) }),
    );
    const { getByText } = render(
      <ListaPlantelPublico equipoId="eq-1" integrantes={INTEGRANTES} mostrarRoles />,
    );
    await waitFor(() => expect(getByText('Ana')).toBeTruthy());
    expect(getByText('Ana').textContent).toBe('Ana');
    expect(getByText('Bruno').textContent).toBe('Bruno');
  });

  it('cuando mi perfilId coincide con una fila, la marca "(vos)"', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { roles: ['player'], perfilId: 'perfil-2' } }) }),
    );
    const { getByText } = render(
      <ListaPlantelPublico equipoId="eq-1" integrantes={INTEGRANTES} mostrarRoles />,
    );
    await waitFor(() => expect(getByText('Bruno (vos)')).toBeTruthy());
    expect(getByText('Ana').textContent).toBe('Ana');
  });

  it('con mostrarRoles en false, no muestra la etiqueta de rol', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: { roles: [], perfilId: null } }) }),
    );
    const { queryByText } = render(
      <ListaPlantelPublico equipoId="eq-1" integrantes={INTEGRANTES} mostrarRoles={false} />,
    );
    await waitFor(() => expect(queryByText('Ana')).toBeTruthy());
    expect(queryByText('Capitán')).toBeNull();
  });
});
