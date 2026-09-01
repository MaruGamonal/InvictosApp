import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const EQUIPO = '22222222-2222-2222-2222-222222222222';
const PERFIL_1 = '33333333-3333-3333-3333-333333333333';
const PERFIL_2 = '44444444-4444-4444-4444-444444444444';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  inscripcionExiste?: boolean;
  minJugadores?: number | null;
  maxJugadores?: number | null;
  fechaCierrePasada?: boolean;
  plantelActivo?: string[];
  lanzarErrorJugadorHabilitado?: boolean;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.startsWith('SELECT estado FROM inscripcion')) {
          return { rows: opciones.inscripcionExiste === false ? [] : [{ estado: 'approved' }] };
        }
        if (texto.startsWith('SELECT min_jugadores_lista')) {
          return {
            rows: [
              {
                min_jugadores_lista: opciones.minJugadores ?? null,
                max_jugadores_lista: opciones.maxJugadores ?? null,
                fecha_cierre_lista_buena_fe: opciones.fechaCierrePasada
                  ? new Date('2020-01-01')
                  : null,
              },
            ],
          };
        }
        if (texto.includes('FROM integrante_equipo')) {
          if (texto.startsWith('SELECT perfil_id')) {
            return {
              rows: (opciones.plantelActivo ?? [PERFIL_1, PERFIL_2]).map((perfil_id) => ({
                perfil_id,
              })),
            };
          }
          return {
            rows: (opciones.rolesEnEquipo ?? ['captain']).map((rol_equipo) => ({ rol_equipo })),
          };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          if (
            texto.trim().startsWith('INSERT INTO integrante_habilitado') &&
            opciones.lanzarErrorJugadorHabilitado
          ) {
            throw new Error('JUGADOR_YA_HABILITADO_EN_EL_TORNEO');
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
}

describe('confirmarPlantel', () => {
  it('confirma una lista de dos jugadores sin problema', async () => {
    mockearDb({ perfilId: 'perfil-cap' });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    const resultado = await confirmarPlantel(
      {
        torneoId: TORNEO,
        equipoId: EQUIPO,
        integrantes: [
          { perfilId: PERFIL_1, rolEnTorneo: 'player' },
          { perfilId: PERFIL_2, rolEnTorneo: 'player' },
        ],
      },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ cantidadJugadores: 2, advertenciaMinimoNoAlcanzado: false });
  });

  it('el cuerpo técnico no ocupa cupo de jugadores', async () => {
    mockearDb({ perfilId: 'perfil-cap', maxJugadores: 1 });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [
            { perfilId: PERFIL_1, rolEnTorneo: 'player' },
            { perfilId: PERFIL_2, rolEnTorneo: 'coach' },
          ],
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ cantidadJugadores: 1, advertenciaMinimoNoAlcanzado: false });
  });

  it('supera el máximo configurado, EXCEDE_MAXIMO_PLANTEL', async () => {
    mockearDb({ perfilId: 'perfil-cap', maxJugadores: 1 });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [
            { perfilId: PERFIL_1, rolEnTorneo: 'player' },
            { perfilId: PERFIL_2, rolEnTorneo: 'player' },
          ],
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'EXCEDE_MAXIMO_PLANTEL' });
  });

  it('por debajo del mínimo, se acepta con advertencia', async () => {
    mockearDb({ perfilId: 'perfil-cap', minJugadores: 5 });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    const resultado = await confirmarPlantel(
      {
        torneoId: TORNEO,
        equipoId: EQUIPO,
        integrantes: [{ perfilId: PERFIL_1, rolEnTorneo: 'player' }],
      },
      contextoCon('usuario-1'),
    );

    expect(resultado.advertenciaMinimoNoAlcanzado).toBe(true);
  });

  it('un jugador ya habilitado en otro equipo del mismo torneo, JUGADOR_YA_HABILITADO_EN_EL_TORNEO', async () => {
    mockearDb({ perfilId: 'perfil-cap', lanzarErrorJugadorHabilitado: true });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [{ perfilId: PERFIL_1, rolEnTorneo: 'player' }],
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'JUGADOR_YA_HABILITADO_EN_EL_TORNEO' });
  });

  it('no se puede anotar a alguien que no integra el plantel', async () => {
    mockearDb({ perfilId: 'perfil-cap', plantelActivo: [PERFIL_1] });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [{ perfilId: PERFIL_2, rolEnTorneo: 'player' }],
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('con la lista ya cerrada, DATOS_INVALIDOS', async () => {
    mockearDb({ perfilId: 'perfil-cap', fechaCierrePasada: true });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [{ perfilId: PERFIL_1, rolEnTorneo: 'player' }],
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('sin inscripción en este torneo, NO_ENCONTRADO', async () => {
    mockearDb({ perfilId: 'perfil-cap', inscripcionExiste: false });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [{ perfilId: PERFIL_1, rolEnTorneo: 'player' }],
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('un jugador sin más roles no puede confirmar el plantel', async () => {
    mockearDb({ perfilId: 'perfil-jug', rolesEnEquipo: ['player'] });
    const { confirmarPlantel } = await import('./confirmarPlantel');

    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [{ perfilId: PERFIL_1, rolEnTorneo: 'player' }],
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { confirmarPlantel } = await import('./confirmarPlantel');
    await expect(
      confirmarPlantel(
        {
          torneoId: TORNEO,
          equipoId: EQUIPO,
          integrantes: [{ perfilId: PERFIL_1, rolEnTorneo: 'player' }],
        },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
