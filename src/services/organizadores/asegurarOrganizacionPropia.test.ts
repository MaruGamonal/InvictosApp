import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  organizacionPropiaId?: string | null;
  nombreVisible?: string;
  cuentaConfirmada?: boolean;
}) {
  const consultasCliente: string[] = [];
  vi.doMock('@/lib/supabase/admin', () => ({
    obtenerClienteAdmin: () => ({ auth: { signInWithOtp: vi.fn(async () => ({ error: null })) } }),
  }));
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('email_confirmado FROM usuario')) {
          return {
            rows: [
              { email: 'usuario@example.com', email_confirmado: opciones.cuentaConfirmada ?? true },
            ],
          };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return {
            rows: opciones.organizacionPropiaId
              ? [{ organizacion_id: opciones.organizacionPropiaId }]
              : [],
          };
        }
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: [{ nombre_visible: opciones.nombreVisible ?? 'Vale' }] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim().toUpperCase());
          if (texto.trim().toUpperCase().startsWith('INSERT INTO ORGANIZACION')) {
            return { rows: [{ id: 'org-nueva' }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('asegurarOrganizacionPropia', () => {
  it('devuelve la organización existente sin crear una nueva', async () => {
    const consultas = mockearDb({ organizacionPropiaId: 'org-existente' });
    const { asegurarOrganizacionPropia } = await import('./asegurarOrganizacionPropia');

    const resultado = await asegurarOrganizacionPropia(undefined, contextoCon('usuario-1'));

    expect(resultado).toEqual({ organizacionId: 'org-existente', creada: false });
    expect(consultas).toHaveLength(0);
  });

  it('crea una organización de arranque cuando la persona no tiene ninguna', async () => {
    const consultas = mockearDb({ organizacionPropiaId: null, nombreVisible: 'Marce' });
    const { asegurarOrganizacionPropia } = await import('./asegurarOrganizacionPropia');

    const resultado = await asegurarOrganizacionPropia(undefined, contextoCon('usuario-1'));

    expect(resultado).toEqual({ organizacionId: 'org-nueva', creada: true });
    expect(consultas.some((c) => c.startsWith('INSERT INTO ORGANIZACION'))).toBe(true);
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { asegurarOrganizacionPropia } = await import('./asegurarOrganizacionPropia');
    await expect(asegurarOrganizacionPropia(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('con la cuenta sin confirmar, CUENTA_NO_CONFIRMADA', async () => {
    mockearDb({ organizacionPropiaId: 'org-existente', cuentaConfirmada: false });
    const { asegurarOrganizacionPropia } = await import('./asegurarOrganizacionPropia');
    await expect(
      asegurarOrganizacionPropia(undefined, contextoCon('usuario-1')),
    ).rejects.toMatchObject({
      codigo: 'CUENTA_NO_CONFIRMADA',
    });
  });
});
