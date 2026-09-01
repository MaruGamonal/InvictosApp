import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

function crearClienteFalso() {
  const consultas: string[] = [];
  const query = vi.fn(async (texto: string) => {
    consultas.push(texto.trim().toUpperCase());
    if (texto.trim().toUpperCase().startsWith('INSERT INTO ORGANIZACION')) {
      return { rows: [{ id: 'org-nueva' }] };
    }
    return { rows: [] };
  });
  return { client: { query, release: vi.fn() }, consultas };
}

beforeEach(() => {
  vi.resetModules();
});

describe('crearOrganizacion', () => {
  it('la crea sin ningún paso de aprobación, con quien la crea como titular', async () => {
    const { client, consultas } = crearClienteFalso();
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ connect: async () => client }) }));

    const { crearOrganizacion } = await import('./crearOrganizacion');
    const resultado = await crearOrganizacion({ nombre: 'Liga Amateur' }, contextoCon('usuario-1'));

    expect(resultado).toEqual({ id: 'org-nueva', nivelVerificacion: 'unverified' });
    expect(consultas[0]).toBe('BEGIN');
    expect(consultas.some((c) => c.startsWith('INSERT INTO ORGANIZACION'))).toBe(true);
    expect(consultas.some((c) => c.startsWith('INSERT INTO MIEMBRO_ORGANIZACION'))).toBe(true);
    expect(consultas.at(-1)).toBe('COMMIT');
    vi.doUnmock('@/db/cliente');
  });

  it('rechaza sin sesión', async () => {
    const { client } = crearClienteFalso();
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ connect: async () => client }) }));
    const { crearOrganizacion } = await import('./crearOrganizacion');
    await expect(crearOrganizacion({ nombre: 'Liga' }, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
    vi.doUnmock('@/db/cliente');
  });
});
