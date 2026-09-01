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

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin' }) {
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
          return { rows: [] };
        }
        if (texto.includes('FROM inscripcion i')) {
          return {
            rows: [
              {
                equipo_id: 'equipo-1',
                nombre: 'Equipo A',
                estado: 'pending',
                advertencia_categoria: true,
                motivo_estado: null,
                motivo_estado_detalle: null,
                fecha_solicitud: new Date('2026-01-01T00:00:00Z'),
              },
            ],
          };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('listarInscripciones', () => {
  it('el titular lista las inscripciones del torneo, con la advertencia de categoría visible', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { listarInscripciones } = await import('./listarInscripciones');
    const resultado = await listarInscripciones({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado).toEqual([
      {
        equipoId: 'equipo-1',
        nombreEquipo: 'Equipo A',
        estado: 'pending',
        advertenciaCategoria: true,
        motivoEstado: null,
        motivoEstadoDetalle: null,
        fechaSolicitud: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('un colaborador no puede ver el panel de inscripciones', async () => {
    mockearDb({});
    const { listarInscripciones } = await import('./listarInscripciones');
    await expect(
      listarInscripciones({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
