import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  organizacionId?: string;
  rolOrganizacion?: 'owner' | 'admin';
  fila?: Record<string, unknown> | null;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT organizacion_id FROM torneo WHERE id')) {
          return {
            rows: opciones.organizacionId ? [{ organizacion_id: opciones.organizacionId }] : [],
          };
        }
        if (texto.includes('SELECT rol FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('FROM torneo t')) {
          const fila =
            opciones.fila === undefined
              ? { estado: 'draft', ciudad_nombre: 'San Isidro', nivel_verificacion: 'basic' }
              : opciones.fila;
          return { rows: fila ? [fila] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerResumenParaPublicar', () => {
  it('sin ser titular ni administrador de la organización, SIN_PERMISO', async () => {
    mockearDb({ organizacionId: 'org-1' });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    await expect(
      obtenerResumenParaPublicar({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ organizacionId: 'org-1', rolOrganizacion: 'owner', fila: null });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    await expect(
      obtenerResumenParaPublicar({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('con organización verificada (basic o trusted), organizacionVerificada true', async () => {
    mockearDb({ organizacionId: 'org-1', rolOrganizacion: 'owner' });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({
      torneoEstado: 'draft',
      ciudadNombre: 'San Isidro',
      organizacionVerificada: true,
    });
  });

  it('con organización sin verificar, organizacionVerificada false', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      fila: { estado: 'draft', ciudad_nombre: 'San Isidro', nivel_verificacion: 'unverified' },
    });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado.organizacionVerificada).toBe(false);
  });
});
