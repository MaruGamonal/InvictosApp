import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const EQUIPO = '11111111-1111-1111-1111-111111111111';
const CIUDAD = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function filaIntegrante(over: Partial<Record<string, unknown>> = {}) {
  return {
    perfil_id: 'perfil-1',
    nombre_visible: 'Jugador Uno',
    foto_url: 'https://cdn.example.com/foto.png',
    posicion: 'forward',
    visibilidad: 'public',
    rol_equipo: 'player',
    ...over,
  };
}

function mockearDb(opciones: {
  equipo?: Record<string, unknown> | null;
  integrantes?: ReturnType<typeof filaIntegrante>[];
  historial?: Record<string, unknown>[];
  proximo?: Record<string, unknown>[];
  ultimo?: Record<string, unknown>[];
  score?: Record<string, unknown>[];
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        const t = texto.trim();
        if (t.startsWith('SELECT e.id, e.nombre')) {
          const equipo =
            opciones.equipo === undefined
              ? {
                  id: EQUIPO,
                  nombre: 'Equipo Demo',
                  escudo_url: null,
                  colores: 'Azul y blanco',
                  ciudad_id: CIUDAD,
                  ciudad_nombre: 'La Plata',
                  modalidad_habitual: 'f5',
                  categoria_genero: 'male',
                  estado: 'active',
                }
              : opciones.equipo;
          return { rows: equipo ? [equipo] : [] };
        }
        if (t.startsWith('SELECT ie.perfil_id')) {
          return { rows: opciones.integrantes ?? [filaIntegrante()] };
        }
        if (t.startsWith('SELECT i.torneo_id')) {
          return { rows: opciones.historial ?? [] };
        }
        if (t.includes("p.estado = 'scheduled'")) {
          return { rows: opciones.proximo ?? [] };
        }
        if (t.includes("p.estado IN ('played', 'walkover')")) {
          return { rows: opciones.ultimo ?? [] };
        }
        if (t.startsWith('SELECT valor, partidos_computados')) {
          return { rows: opciones.score ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerEquipoPublico', () => {
  it('devuelve el equipo, su plantel y su historial', async () => {
    mockearDb({
      historial: [
        {
          torneo_id: 't1',
          torneo_nombre: 'Copa Demo',
          torneo_estado: 'finished',
          partidos_jugados: '5',
          ganados: '3',
          empatados: '1',
          perdidos: '1',
          goles_favor: '10',
          goles_contra: '5',
          puntos: '10',
          ajuste_puntos: '0',
        },
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');

    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);

    expect(equipo.nombre).toBe('Equipo Demo');
    expect(equipo.ciudad).toEqual({ id: CIUDAD, nombre: 'La Plata' });
    expect(equipo.plantel).toEqual([
      {
        perfilId: 'perfil-1',
        nombreVisible: 'Jugador Uno',
        fotoUrl: 'https://cdn.example.com/foto.png',
        posicion: 'forward',
        rolesEquipo: ['player'],
      },
    ]);
    expect(equipo.historial).toEqual([
      {
        torneoId: 't1',
        torneoNombre: 'Copa Demo',
        torneoEstado: 'finished',
        partidosJugados: 5,
        ganados: 3,
        empatados: 1,
        perdidos: 1,
        golesFavor: 10,
        golesContra: 5,
        puntos: 10,
        ajustePuntos: 0,
      },
    ]);
    expect(equipo.acumulado).toEqual({
      partidosJugados: 5,
      ganados: 3,
      empatados: 1,
      perdidos: 1,
      golesFavor: 10,
      golesContra: 5,
      puntos: 10,
      ajustePuntos: 0,
    });
    expect(equipo.score).toBeNull();
  });

  it('sin fila en score_equipo todavía, score null', async () => {
    mockearDb({});
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);
    expect(equipo.score).toBeNull();
  });

  it('con estado insufficient_activity o stale, score null aunque haya una fila', async () => {
    mockearDb({
      score: [
        { valor: null, partidos_computados: 0, estado: 'insufficient_activity', desglose_componentes: null },
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);
    expect(equipo.score).toBeNull();
  });

  it('con estado active, devuelve el valor y el desglose', async () => {
    const desglose = {
      ventanaMeses: 24,
      partidosGanados: 17,
      partidosEmpatados: 4,
      partidosPerdidos: 7,
      promedioPuntos: 1.96,
      componenteResultados: 32.7,
      promedioDiferenciaGol: 0.8,
      componenteDiferenciaGol: 12.5,
      torneosDisputados: 5,
      componenteTorneos: 12.5,
      bonusPosicionPromedio: 0.6,
      componentePosicion: 9,
    };
    mockearDb({
      score: [
        { valor: '78', partidos_computados: 28, estado: 'active', desglose_componentes: desglose },
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);
    expect(equipo.score).toEqual({ valor: 78, partidosComputados: 28, desglose });
  });

  it('separa plantel y cuerpo técnico por rol_equipo', async () => {
    mockearDb({
      integrantes: [
        filaIntegrante({ perfil_id: 'jugador', rol_equipo: 'player' }),
        filaIntegrante({ perfil_id: 'capitan', rol_equipo: 'captain' }),
        filaIntegrante({ perfil_id: 'dt', rol_equipo: 'coach' }),
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');

    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);

    expect(equipo.plantel.map((p) => p.perfilId)).toEqual(['jugador', 'capitan']);
    expect(equipo.cuerpoTecnico.map((p) => p.perfilId)).toEqual(['dt']);
  });

  it('un integrante con perfil restricted no muestra foto ni posición, pero sí su nombre y su rol', async () => {
    mockearDb({ integrantes: [filaIntegrante({ visibilidad: 'restricted' })] });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');

    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);

    expect(equipo.plantel[0]).toEqual({
      perfilId: 'perfil-1',
      nombreVisible: 'Jugador Uno',
      fotoUrl: null,
      posicion: null,
      rolesEquipo: ['player'],
    });
  });

  it('una persona con dos roles activos en el mismo equipo aparece una sola vez, con los dos roles', async () => {
    mockearDb({
      integrantes: [
        filaIntegrante({ perfil_id: 'perfil-1', rol_equipo: 'player' }),
        filaIntegrante({ perfil_id: 'perfil-1', rol_equipo: 'delegate' }),
        filaIntegrante({ perfil_id: 'perfil-2', rol_equipo: 'captain' }),
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');

    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);

    expect(equipo.plantel).toHaveLength(2);
    const conDosRoles = equipo.plantel.find((p) => p.perfilId === 'perfil-1');
    expect(conDosRoles?.rolesEquipo).toEqual(['player', 'delegate']);
  });

  it('una persona jugadora y DT a la vez aparece en plantel y en cuerpo técnico, una sola vez en cada uno', async () => {
    mockearDb({
      integrantes: [
        filaIntegrante({ perfil_id: 'perfil-1', rol_equipo: 'player' }),
        filaIntegrante({ perfil_id: 'perfil-1', rol_equipo: 'coach' }),
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');

    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);

    expect(equipo.plantel.map((p) => p.perfilId)).toEqual(['perfil-1']);
    expect(equipo.cuerpoTecnico.map((p) => p.perfilId)).toEqual(['perfil-1']);
  });

  it('un equipo sin historial todavía devuelve listas vacías y acumulado en cero', async () => {
    mockearDb({ historial: [] });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');

    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);

    expect(equipo.historial).toEqual([]);
    expect(equipo.acumulado).toEqual({
      partidosJugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      golesFavor: 0,
      golesContra: 0,
      puntos: 0,
      ajustePuntos: 0,
    });
  });

  it('sin próximo partido ni resultados, ambos null', async () => {
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    mockearDb({});
    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);
    expect(equipo.proximoPartido).toBeNull();
    expect(equipo.ultimoResultado).toBeNull();
  });

  it('con próximo partido de local, arma rival y fecha desde el punto de vista del equipo', async () => {
    mockearDb({
      proximo: [
        {
          torneo_id: 't1',
          torneo_nombre: 'Copa Demo',
          numero_fecha: 3,
          equipo_local_id: EQUIPO,
          equipo_local_nombre: 'Equipo Demo',
          equipo_local_escudo_url: null,
          equipo_visitante_id: 'rival-1',
          equipo_visitante_nombre: 'Rival FC',
          equipo_visitante_escudo_url: 'https://cdn.example.com/rival.png',
          fecha_hora_programada: new Date('2026-05-01T18:00:00Z'),
          sede_nombre: 'Cancha 1',
        },
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);
    expect(equipo.proximoPartido).toEqual({
      torneoId: 't1',
      torneoNombre: 'Copa Demo',
      numeroFecha: 3,
      esLocal: true,
      rivalId: 'rival-1',
      rivalNombre: 'Rival FC',
      rivalEscudoUrl: 'https://cdn.example.com/rival.png',
      fechaHoraProgramada: '2026-05-01T18:00:00.000Z',
      sedeNombre: 'Cancha 1',
    });
  });

  it('con último resultado de visitante, arma los goles desde el punto de vista del equipo', async () => {
    mockearDb({
      ultimo: [
        {
          torneo_id: 't1',
          torneo_nombre: 'Copa Demo',
          equipo_local_id: 'rival-1',
          equipo_local_nombre: 'Rival FC',
          equipo_local_escudo_url: null,
          equipo_visitante_id: EQUIPO,
          equipo_visitante_nombre: 'Equipo Demo',
          equipo_visitante_escudo_url: null,
          fecha_hora_programada: new Date('2026-04-01T18:00:00Z'),
          estado: 'played',
          goles_local: 1,
          goles_visitante: 3,
        },
      ],
    });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    const equipo = await obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE);
    expect(equipo.ultimoResultado).toEqual({
      torneoId: 't1',
      torneoNombre: 'Copa Demo',
      estado: 'played',
      esLocal: false,
      rivalId: 'rival-1',
      rivalNombre: 'Rival FC',
      rivalEscudoUrl: null,
      fechaHoraProgramada: '2026-04-01T18:00:00.000Z',
      golesPropios: 3,
      golesRival: 1,
    });
  });

  it('equipo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ equipo: null });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    await expect(obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
