import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const EQUIPO = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string;
  rolesEnEquipo?: string[];
  inscripcionExiste?: boolean;
  torneo?: Record<string, unknown> | null;
  plantel?: Array<{ perfil_id: string; nombre_visible: string; rol_equipo: string }>;
  habilitadosPropios?: Array<{
    perfil_id: string;
    rol_en_torneo: string;
    numero_camiseta: number | null;
  }>;
  habilitadosEnOtroEquipo?: Array<{ perfil_id: string }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo WHERE usuario_id')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (sql.startsWith('SELECT rol_equipo FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? ['captain']).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (sql.startsWith('SELECT 1 FROM inscripcion')) {
          return { rows: opciones.inscripcionExiste === false ? [] : [{}] };
        }
        if (sql.includes('FROM torneo WHERE id')) {
          const torneo =
            opciones.torneo === undefined
              ? {
                  nombre: 'Copa Otoño F5',
                  min_jugadores_lista: 7,
                  max_jugadores_lista: 15,
                  fecha_cierre_lista_buena_fe: null,
                  jugador_unico_por_equipo: true,
                }
              : opciones.torneo;
          return { rows: torneo ? [torneo] : [] };
        }
        if (sql.includes('FROM integrante_equipo ie')) {
          return { rows: opciones.plantel ?? [] };
        }
        if (sql.includes('FROM integrante_habilitado') && sql.includes('equipo_id = $2')) {
          return { rows: opciones.habilitadosPropios ?? [] };
        }
        if (sql.includes('FROM integrante_habilitado') && sql.includes('equipo_id <> $2')) {
          return { rows: opciones.habilitadosEnOtroEquipo ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerListaDeBuenaFe', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { obtenerListaDeBuenaFe } = await import('./obtenerListaDeBuenaFe');
    await expect(
      obtenerListaDeBuenaFe({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('sin ser capitán ni delegado del equipo, SIN_PERMISO', async () => {
    mockearDb({ perfilId: 'perfil-1', rolesEnEquipo: ['player'] });
    const { obtenerListaDeBuenaFe } = await import('./obtenerListaDeBuenaFe');
    await expect(
      obtenerListaDeBuenaFe({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin inscripción de este equipo en el torneo, NO_ENCONTRADO', async () => {
    mockearDb({ perfilId: 'perfil-1', inscripcionExiste: false });
    const { obtenerListaDeBuenaFe } = await import('./obtenerListaDeBuenaFe');
    await expect(
      obtenerListaDeBuenaFe({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('junta los roles de una misma persona y marca quién ya está habilitado en otro equipo', async () => {
    mockearDb({
      perfilId: 'perfil-capitan',
      plantel: [
        { perfil_id: 'p-1', nombre_visible: 'Bruno Sosa', rol_equipo: 'captain' },
        { perfil_id: 'p-1', nombre_visible: 'Bruno Sosa', rol_equipo: 'player' },
        { perfil_id: 'p-2', nombre_visible: 'Leo Ferrari', rol_equipo: 'player' },
      ],
      habilitadosEnOtroEquipo: [{ perfil_id: 'p-2' }],
    });
    const { obtenerListaDeBuenaFe } = await import('./obtenerListaDeBuenaFe');
    const resultado = await obtenerListaDeBuenaFe(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );

    expect(resultado.torneoNombre).toBe('Copa Otoño F5');
    expect(resultado.integrantes).toEqual([
      {
        perfilId: 'p-1',
        nombreVisible: 'Bruno Sosa',
        rolesEquipo: ['captain', 'player'],
        rolHabilitado: null,
        numeroCamiseta: null,
        yaHabilitadoEnOtroEquipo: false,
      },
      {
        perfilId: 'p-2',
        nombreVisible: 'Leo Ferrari',
        rolesEquipo: ['player'],
        rolHabilitado: null,
        numeroCamiseta: null,
        yaHabilitadoEnOtroEquipo: true,
      },
    ]);
  });

  it('sin jugador_unico_por_equipo, no marca a nadie como bloqueado por otro equipo', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      torneo: {
        nombre: 'Copa Otoño F5',
        min_jugadores_lista: null,
        max_jugadores_lista: null,
        fecha_cierre_lista_buena_fe: null,
        jugador_unico_por_equipo: false,
      },
      plantel: [{ perfil_id: 'p-2', nombre_visible: 'Leo Ferrari', rol_equipo: 'player' }],
      habilitadosEnOtroEquipo: [{ perfil_id: 'p-2' }],
    });
    const { obtenerListaDeBuenaFe } = await import('./obtenerListaDeBuenaFe');
    const resultado = await obtenerListaDeBuenaFe(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado.integrantes[0]?.yaHabilitadoEnOtroEquipo).toBe(false);
  });

  it('con fecha de cierre pasada, cerrada true', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      torneo: {
        nombre: 'Copa Otoño F5',
        min_jugadores_lista: null,
        max_jugadores_lista: null,
        fecha_cierre_lista_buena_fe: new Date('2000-01-01'),
        jugador_unico_por_equipo: true,
      },
    });
    const { obtenerListaDeBuenaFe } = await import('./obtenerListaDeBuenaFe');
    const resultado = await obtenerListaDeBuenaFe(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado.cerrada).toBe(true);
  });
});
