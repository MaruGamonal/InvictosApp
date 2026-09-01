import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const EQUIPO = '22222222-2222-2222-2222-222222222222';
const ORG = '33333333-3333-3333-3333-333333333333';

const notificarMock = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  notificarMock.mockClear();
  vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: notificarMock }));
});

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  esColaborador?: boolean;
  rowCountUpdate?: number;
  cupoCompleto?: boolean;
  gestores?: string[];
}) {
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: opciones.esColaborador ? [{}] : [] };
        }
        if (texto.includes('pd.usuario_id')) {
          return { rows: (opciones.gestores ?? []).map((usuario_id) => ({ usuario_id })) };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim());
          if (texto.trim().startsWith('UPDATE inscripcion')) {
            return { rowCount: opciones.rowCountUpdate ?? 1 };
          }
          if (texto.includes('SELECT t.cupo_equipos')) {
            return { rows: [{ cupo_equipos: 8, aprobados: opciones.cupoCompleto ? '8' : '3' }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('resolverInscripcion', () => {
  it('el titular aprueba una inscripción pendiente y notifica al capitán', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', gestores: ['usuario-cap'] });
    const { resolverInscripcion } = await import('./resolverInscripcion');

    const resultado = await resolverInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO, decision: 'approved' },
      contextoCon('usuario-titular'),
    );

    expect(resultado).toEqual({ estado: 'approved' });
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'registration_resolved' }),
      expect.anything(),
    );
  });

  it('al aprobar la última vacante, cierra el torneo en la misma transacción', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner', cupoCompleto: true });
    const { resolverInscripcion } = await import('./resolverInscripcion');

    await resolverInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO, decision: 'approved' },
      contextoCon('usuario-titular'),
    );

    expect(consultas.some((c) => c.startsWith('UPDATE torneo'))).toBe(true);
  });

  it('rechazar sin motivo, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { resolverInscripcion } = await import('./resolverInscripcion');
    await expect(
      resolverInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, decision: 'rejected' },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza con motivo other pero sin texto libre, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { resolverInscripcion } = await import('./resolverInscripcion');
    await expect(
      resolverInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, decision: 'rejected', motivo: 'other' },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza correctamente con motivo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { resolverInscripcion } = await import('./resolverInscripcion');
    await expect(
      resolverInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, decision: 'rejected', motivo: 'roster_incomplete' },
        contextoCon('usuario-titular'),
      ),
    ).resolves.toEqual({ estado: 'rejected' });
  });

  it('sin inscripción pendiente/en espera, NO_ENCONTRADO', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', rowCountUpdate: 0 });
    const { resolverInscripcion } = await import('./resolverInscripcion');
    await expect(
      resolverInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, decision: 'approved' },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('un colaborador asignado al torneo no puede resolver inscripciones', async () => {
    mockearDb({ esColaborador: true });
    const { resolverInscripcion } = await import('./resolverInscripcion');
    await expect(
      resolverInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, decision: 'approved' },
        contextoCon('usuario-colaborador'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { resolverInscripcion } = await import('./resolverInscripcion');
    await expect(
      resolverInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, decision: 'approved' },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
