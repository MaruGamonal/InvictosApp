import { beforeEach, describe, expect, it, vi } from 'vitest';

const GRUPO_A = '11111111-1111-1111-1111-111111111111';
const GRUPO_B = '22222222-2222-2222-2222-222222222222';
const FASE = '33333333-3333-3333-3333-333333333333';
const TORNEO = '44444444-4444-4444-4444-444444444444';
const EQUIPO_X = '55555555-5555-5555-5555-555555555555';
const EQUIPO_Y = '66666666-6666-6666-6666-666666666666';
const EQUIPO_Z = '77777777-7777-7777-7777-777777777777';

/** Estas lecturas son públicas: `obtenerTabla` no mira la sesión. */
const CONTEXTO = { usuarioId: null, permisos: {}, esSistema: false };

beforeEach(() => vi.resetModules());

function filaPosicion(equipoId: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    equipo_id: equipoId,
    equipo_nombre: `Equipo ${equipoId}`,
    equipo_escudo_url: null,
    puntos: 3,
    ajuste_puntos: 0,
    partidos_jugados: 1,
    ganados: 1,
    empatados: 0,
    perdidos: 0,
    goles_favor: 2,
    goles_contra: 1,
    diferencia_gol: 1,
    ganados_por_presentacion: '0',
    ...over,
  };
}

function mockearDb(opciones: {
  gruposPorFase?: { id: string; nombre: string; torneo_id: string }[];
  grupoUnico?: { id: string; nombre: string; torneo_id: string } | null;
  criteriosDesempate?: string[];
  posicionPorGrupo?: Record<string, ReturnType<typeof filaPosicion>[]>;
  partidosEntreSi?: {
    equipo_local_id: string;
    equipo_visitante_id: string;
    goles_local: number;
    goles_visitante: number;
  }[];
  hayDisputado?: boolean;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        if (t.includes('FROM grupo g JOIN fase f') && t.includes('WHERE g.id')) {
          return { rows: opciones.grupoUnico ? [opciones.grupoUnico] : [] };
        }
        if (t.includes('FROM grupo g JOIN fase f') && t.includes('WHERE f.id')) {
          return { rows: opciones.gruposPorFase ?? [] };
        }
        if (t.startsWith('SELECT criterios_desempate')) {
          return {
            rows: [
              {
                criterios_desempate: opciones.criteriosDesempate ?? [
                  'goal_difference',
                  'goals_for',
                  'head_to_head',
                ],
                puntos_victoria: 3,
                puntos_empate: 1,
                puntos_derrota: 0,
              },
            ],
          };
        }
        // La consulta arranca con el CTE que saca los equipos del grupo
        // de `partido`: la tabla se arma desde ahí y no desde `posicion`,
        // para que un torneo sin resultados todavía muestre a todos en
        // cero en vez de aparecer vacío.
        if (t.startsWith('WITH equipos_del_grupo')) {
          const grupoId = valores[0] as string;
          return { rows: opciones.posicionPorGrupo?.[grupoId] ?? [] };
        }
        if (t.includes('FROM partido') && t.includes("estado = 'played'")) {
          return { rows: opciones.partidosEntreSi ?? [] };
        }
        if (t.includes("estado_resultado = 'disputed'")) {
          return { rows: opciones.hayDisputado ? [{}] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerTabla', () => {
  it('devuelve la tabla de un grupo puntual, ya ordenada, sin más trabajo', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      posicionPorGrupo: {
        [GRUPO_A]: [filaPosicion(EQUIPO_X, { puntos: 6 }), filaPosicion(EQUIPO_Y, { puntos: 3 })],
      },
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const tabla = await obtenerTabla(
      { grupoId: GRUPO_A },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tabla).toEqual([
      {
        grupoId: GRUPO_A,
        nombre: 'Zona A',
        provisorio: false,
        filas: [
          expect.objectContaining({ equipoId: EQUIPO_X, puntos: 6 }),
          expect.objectContaining({ equipoId: EQUIPO_Y, puntos: 3 }),
        ],
      },
    ]);
  });

  it('mapea ganados_por_presentacion (recuento de walkovers ganados, `06`, D-33b)', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      posicionPorGrupo: {
        [GRUPO_A]: [filaPosicion(EQUIPO_X, { ganados: 3, ganados_por_presentacion: '1' })],
      },
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const [tabla] = await obtenerTabla(
      { grupoId: GRUPO_A },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tabla!.filas[0]).toEqual(
      expect.objectContaining({ equipoId: EQUIPO_X, ganados: 3, ganadosPorPresentacion: 1 }),
    );
  });

  it('con faseId devuelve una tabla por cada grupo de la fase', async () => {
    mockearDb({
      gruposPorFase: [
        { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
        { id: GRUPO_B, nombre: 'Zona B', torneo_id: TORNEO },
      ],
      posicionPorGrupo: {
        [GRUPO_A]: [filaPosicion(EQUIPO_X)],
        [GRUPO_B]: [filaPosicion(EQUIPO_Y)],
      },
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const tablas = await obtenerTabla(
      { faseId: FASE },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tablas.map((t) => t.grupoId)).toEqual([GRUPO_A, GRUPO_B]);
  });

  it('dos equipos empatados en puntos, diferencia y goles a favor se desempatan por enfrentamiento directo', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      posicionPorGrupo: {
        [GRUPO_A]: [
          filaPosicion(EQUIPO_X, { puntos: 3, diferencia_gol: 0, goles_favor: 1 }),
          filaPosicion(EQUIPO_Y, { puntos: 3, diferencia_gol: 0, goles_favor: 1 }),
        ],
      },
      partidosEntreSi: [
        {
          equipo_local_id: EQUIPO_Y,
          equipo_visitante_id: EQUIPO_X,
          goles_local: 2,
          goles_visitante: 0,
        },
      ],
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const [tabla] = await obtenerTabla(
      { grupoId: GRUPO_A },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tabla!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_Y, EQUIPO_X]);
  });

  it('sin head_to_head en los criterios configurados, no reordena empatados', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      criteriosDesempate: ['goal_difference', 'goals_for'],
      posicionPorGrupo: {
        [GRUPO_A]: [
          filaPosicion(EQUIPO_X, { puntos: 3, diferencia_gol: 0, goles_favor: 1 }),
          filaPosicion(EQUIPO_Y, { puntos: 3, diferencia_gol: 0, goles_favor: 1 }),
        ],
      },
      partidosEntreSi: [
        {
          equipo_local_id: EQUIPO_Y,
          equipo_visitante_id: EQUIPO_X,
          goles_local: 2,
          goles_visitante: 0,
        },
      ],
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const [tabla] = await obtenerTabla(
      { grupoId: GRUPO_A },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tabla!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_X, EQUIPO_Y]);
  });

  it('un grupo de tres, dos empatados y uno no: solo reordena a los que siguen empatados', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      posicionPorGrupo: {
        [GRUPO_A]: [
          filaPosicion(EQUIPO_Z, { puntos: 9, diferencia_gol: 5, goles_favor: 8 }),
          filaPosicion(EQUIPO_X, { puntos: 3, diferencia_gol: 0, goles_favor: 1 }),
          filaPosicion(EQUIPO_Y, { puntos: 3, diferencia_gol: 0, goles_favor: 1 }),
        ],
      },
      partidosEntreSi: [
        {
          equipo_local_id: EQUIPO_Y,
          equipo_visitante_id: EQUIPO_X,
          goles_local: 2,
          goles_visitante: 0,
        },
      ],
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const [tabla] = await obtenerTabla(
      { grupoId: GRUPO_A },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tabla!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_Z, EQUIPO_Y, EQUIPO_X]);
  });

  /**
   * El `ORDER BY` tenía `diferencia_gol DESC, goles_favor DESC` fijo y
   * de `criterios_desempate` sólo se miraba si contenía `head_to_head`.
   * Cambiar el orden entre los dos primeros no hacía nada — y la
   * pantalla que deja elegirlo habría guardado algo sin efecto.
   */
  it('respeta el orden configurado entre diferencia de gol y goles a favor', async () => {
    // X: mejor diferencia (+3) y menos goles (3). Y: al revés.
    const filas = [
      filaPosicion(EQUIPO_X, { diferencia_gol: 3, goles_favor: 3 }),
      filaPosicion(EQUIPO_Y, { diferencia_gol: 1, goles_favor: 5 }),
    ];

    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      criteriosDesempate: ['goal_difference', 'goals_for'],
      posicionPorGrupo: { [GRUPO_A]: filas },
    });
    const { obtenerTabla } = await import('./obtenerTabla');
    const porDiferencia = await obtenerTabla({ grupoId: GRUPO_A }, CONTEXTO);
    expect(porDiferencia[0]!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_X, EQUIPO_Y]);

    vi.resetModules();
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      criteriosDesempate: ['goals_for', 'goal_difference'],
      posicionPorGrupo: { [GRUPO_A]: filas },
    });
    const { obtenerTabla: otra } = await import('./obtenerTabla');
    const porGoles = await otra({ grupoId: GRUPO_A }, CONTEXTO);
    expect(porGoles[0]!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_Y, EQUIPO_X]);
  });

  /** Un criterio que no está en la lista no se aplica. Antes se aplicaba igual. */
  it('no aplica un criterio que no está configurado', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      criteriosDesempate: ['goals_for'],
      posicionPorGrupo: {
        [GRUPO_A]: [
          filaPosicion(EQUIPO_X, { diferencia_gol: 9, goles_favor: 1 }),
          filaPosicion(EQUIPO_Y, { diferencia_gol: 0, goles_favor: 4 }),
        ],
      },
    });
    const { obtenerTabla } = await import('./obtenerTabla');
    const tabla = await obtenerTabla({ grupoId: GRUPO_A }, CONTEXTO);
    // La diferencia de gol de X es abrumadora y no cuenta: no está configurada.
    expect(tabla[0]!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_Y, EQUIPO_X]);
  });

  /** `head_to_head` se aplicaba siempre último, aunque estuviera configurado primero. */
  it('con head_to_head primero, gana el que ganó el partido entre ellos', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      criteriosDesempate: ['head_to_head', 'goal_difference'],
      posicionPorGrupo: {
        [GRUPO_A]: [
          filaPosicion(EQUIPO_X, { diferencia_gol: 7, goles_favor: 7 }),
          filaPosicion(EQUIPO_Y, { diferencia_gol: 1, goles_favor: 2 }),
        ],
      },
      partidosEntreSi: [
        {
          equipo_local_id: EQUIPO_Y,
          equipo_visitante_id: EQUIPO_X,
          goles_local: 1,
          goles_visitante: 0,
        },
      ],
    });
    const { obtenerTabla } = await import('./obtenerTabla');
    const tabla = await obtenerTabla({ grupoId: GRUPO_A }, CONTEXTO);
    expect(tabla[0]!.filas.map((f) => f.equipoId)).toEqual([EQUIPO_Y, EQUIPO_X]);
  });

  it('con un resultado disputed en el grupo, la tabla se marca provisoria', async () => {
    mockearDb({
      grupoUnico: { id: GRUPO_A, nombre: 'Zona A', torneo_id: TORNEO },
      posicionPorGrupo: { [GRUPO_A]: [filaPosicion(EQUIPO_X)] },
      hayDisputado: true,
    });
    const { obtenerTabla } = await import('./obtenerTabla');

    const [tabla] = await obtenerTabla(
      { grupoId: GRUPO_A },
      { usuarioId: null, permisos: {}, esSistema: false },
    );

    expect(tabla!.provisorio).toBe(true);
  });

  it('grupo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ grupoUnico: null });
    const { obtenerTabla } = await import('./obtenerTabla');
    await expect(
      obtenerTabla({ grupoId: GRUPO_A }, { usuarioId: null, permisos: {}, esSistema: false }),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin faseId ni grupoId, o los dos a la vez, DATOS_INVALIDOS', async () => {
    mockearDb({});
    const { obtenerTabla } = await import('./obtenerTabla');
    await expect(
      obtenerTabla({}, { usuarioId: null, permisos: {}, esSistema: false }),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    await expect(
      obtenerTabla(
        { faseId: FASE, grupoId: GRUPO_A },
        { usuarioId: null, permisos: {}, esSistema: false },
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
