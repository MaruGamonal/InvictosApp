import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  colaboradores?: Array<{
    usuario_id: string;
    nombre_visible: string | null;
    email: string;
    fecha_asignacion: Date;
  }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM torneo WHERE id')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo ct')) {
          return { rows: opciones.colaboradores ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('listarColaboradoresTorneo', () => {
  it('el titular ve los colaboradores activos del torneo', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      colaboradores: [
        {
          usuario_id: 'usuario-1',
          nombre_visible: 'Marco Ibarra',
          email: 'marco@example.com',
          fecha_asignacion: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    });
    const { listarColaboradoresTorneo } = await import('./listarColaboradoresTorneo');
    const resultado = await listarColaboradoresTorneo(
      { torneoId: TORNEO },
      contextoCon('usuario-titular'),
    );
    expect(resultado).toEqual([
      {
        usuarioId: 'usuario-1',
        nombreVisible: 'Marco Ibarra',
        fechaAsignacion: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('sin perfil deportivo, usa el email como nombre visible', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      colaboradores: [
        {
          usuario_id: 'usuario-1',
          nombre_visible: null,
          email: 'marco@example.com',
          fecha_asignacion: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    });
    const { listarColaboradoresTorneo } = await import('./listarColaboradoresTorneo');
    const resultado = await listarColaboradoresTorneo(
      { torneoId: TORNEO },
      contextoCon('usuario-titular'),
    );
    expect(resultado[0]?.nombreVisible).toBe('marco@example.com');
  });

  it('un colaborador no puede ver la lista de colaboradores', async () => {
    mockearDb({});
    const { listarColaboradoresTorneo } = await import('./listarColaboradoresTorneo');
    await expect(
      listarColaboradoresTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
