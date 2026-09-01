import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const PARTIDO = '11111111-1111-1111-1111-111111111111';
const TORNEO = '22222222-2222-2222-2222-222222222222';
const ORG = '33333333-3333-3333-3333-333333333333';
const EQUIPO_A = '44444444-4444-4444-4444-444444444444';
const EQUIPO_B = '55555555-5555-5555-5555-555555555555';

const notificarMock = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  notificarMock.mockClear();
  vi.doMock('@/services/notificaciones/notificar', () => ({ notificar: notificarMock }));
});

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  esColaborador?: boolean;
  estadoPartido?: string;
  fechaHoraProgramada?: Date | null;
  sedeCreadaId?: string;
}) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto: texto.trim(), valores });
        if (texto.startsWith('SELECT p.torneo_id')) {
          return {
            rows: [
              {
                torneo_id: TORNEO,
                organizacion_id: ORG,
                estado: opciones.estadoPartido ?? 'unscheduled',
                fecha_hora_programada: opciones.fechaHoraProgramada ?? null,
                equipo_local_id: EQUIPO_A,
                equipo_visitante_id: EQUIPO_B,
              },
            ],
          };
        }
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: opciones.esColaborador ? [{}] : [] };
        }
        if (texto.trim().startsWith('INSERT INTO sede')) {
          return { rows: [{ id: opciones.sedeCreadaId ?? 'sede-nueva' }] };
        }
        if (texto.includes('pd.usuario_id')) {
          return {
            rows: [{ usuario_id: 'usuario-capitan-a' }, { usuario_id: 'usuario-capitan-b' }],
          };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('programarPartido', () => {
  it('primera programación: pasa a scheduled y fecha original = fecha programada', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { programarPartido } = await import('./programarPartido');

    const resultado = await programarPartido(
      { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-01T18:00:00.000Z' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ estado: 'scheduled' });
    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update?.texto).toContain('fecha_hora_original');
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'match_scheduled' }),
      expect.anything(),
    );
  });

  it('reprogramación: no vuelve a tocar la fecha original y notifica match_rescheduled', async () => {
    const consultas = mockearDb({
      rolEnOrganizacion: 'owner',
      estadoPartido: 'scheduled',
      fechaHoraProgramada: new Date('2026-05-01T18:00:00.000Z'),
    });
    const { programarPartido } = await import('./programarPartido');

    await programarPartido(
      { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-08T18:00:00.000Z' },
      contextoCon('usuario-1'),
    );

    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update?.texto).not.toContain('fecha_hora_original');
    expect(update?.texto).toContain('reprogramado_por_usuario_id');
    expect(notificarMock).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'match_rescheduled' }),
      expect.anything(),
    );
  });

  it('crea una sede nueva cuando se le pasan los datos mínimos', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner', sedeCreadaId: 'sede-x' });
    const { programarPartido } = await import('./programarPartido');

    await programarPartido(
      {
        partidoId: PARTIDO,
        fechaHoraProgramada: '2026-05-01T18:00:00.000Z',
        sedeNueva: {
          nombre: 'Cancha 1',
          direccion: 'Calle Falsa 123',
          ciudadId: '66666666-6666-6666-6666-666666666666',
        },
      },
      contextoCon('usuario-1'),
    );

    expect(consultas.some((c) => c.texto.startsWith('INSERT INTO sede'))).toBe(true);
    const update = consultas.find((c) => c.texto.startsWith('UPDATE partido'));
    expect(update?.valores).toContain('sede-x');
  });

  it('un partido ya jugado no se puede reprogramar', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoPartido: 'played' });
    const { programarPartido } = await import('./programarPartido');
    await expect(
      programarPartido(
        { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-01T18:00:00.000Z' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un colaborador asignado al torneo puede programar', async () => {
    mockearDb({ esColaborador: true });
    const { programarPartido } = await import('./programarPartido');
    await expect(
      programarPartido(
        { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-01T18:00:00.000Z' },
        contextoCon('usuario-colaborador'),
      ),
    ).resolves.toEqual({ estado: 'scheduled' });
  });

  it('sin sedeId ni sedeNueva es válido: la sede es opcional', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { programarPartido } = await import('./programarPartido');
    await expect(
      programarPartido(
        { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-01T18:00:00.000Z' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ estado: 'scheduled' });
  });

  it('con sedeId y sedeNueva a la vez, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { programarPartido } = await import('./programarPartido');
    await expect(
      programarPartido(
        {
          partidoId: PARTIDO,
          fechaHoraProgramada: '2026-05-01T18:00:00.000Z',
          sedeId: '77777777-7777-7777-7777-777777777777',
          sedeNueva: {
            nombre: 'X',
            direccion: 'Y',
            ciudadId: '66666666-6666-6666-6666-666666666666',
          },
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('quien no está asignado al torneo no puede programar', async () => {
    mockearDb({});
    const { programarPartido } = await import('./programarPartido');
    await expect(
      programarPartido(
        { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-01T18:00:00.000Z' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('partido inexistente, NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { programarPartido } = await import('./programarPartido');
    await expect(
      programarPartido(
        { partidoId: PARTIDO, fechaHoraProgramada: '2026-05-01T18:00:00.000Z' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
