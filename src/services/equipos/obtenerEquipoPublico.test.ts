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
        rolEquipo: 'player',
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
    expect(equipo.scoreEstado).toBe('sin_calcular');
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
      rolEquipo: 'player',
    });
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

  it('equipo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ equipo: null });
    const { obtenerEquipoPublico } = await import('./obtenerEquipoPublico');
    await expect(obtenerEquipoPublico({ equipoId: EQUIPO }, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
