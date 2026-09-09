import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

interface Opciones {
  perfil?: { id: string; nombre_visible: string } | null;
  equipos?: Array<{ id: string; nombre: string; categoria_genero: string; rol_equipo: string }>;
  organizaciones?: Array<{ organizacion_id: string }>;
  partido?: Record<string, unknown> | null;
  torneosSeguidos?: Array<Record<string, unknown>>;
  equiposSeguidos?: Array<{ id: string; nombre: string; categoria_genero: string }>;
  resultadosPorConfirmar?: number;
  torneosAdministrados?: Array<Record<string, unknown>>;
  inscripcionesPendientes?: number;
  resultadosSinCargar?: number;
}

function mockearDb(opciones: Opciones) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return {
            rows:
              opciones.perfil === undefined
                ? [{ id: 'perfil-1', nombre_visible: 'Vale' }]
                : opciones.perfil
                  ? [opciones.perfil]
                  : [],
          };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: opciones.equipos ?? [] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.organizaciones ?? [] };
        }
        if (texto.includes('equipo_local_nombre')) {
          return { rows: opciones.partido ? [opciones.partido] : [] };
        }
        if (texto.includes('posicion_actual')) {
          return { rows: opciones.torneosSeguidos ?? [] };
        }
        if (texto.includes('FROM seguimiento')) {
          return { rows: opciones.equiposSeguidos ?? [] };
        }
        if (texto.includes("estado_resultado = 'loaded'")) {
          return { rows: [{ cantidad: String(opciones.resultadosPorConfirmar ?? 0) }] };
        }
        if (texto.includes('inscriptos')) {
          return { rows: opciones.torneosAdministrados ?? [] };
        }
        if (texto.includes("i.estado = 'pending'")) {
          return { rows: [{ cantidad: String(opciones.inscripcionesPendientes ?? 0) }] };
        }
        if (texto.includes('fecha_hora_programada < now()')) {
          return { rows: [{ cantidad: String(opciones.resultadosSinCargar ?? 0) }] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerInicio', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { obtenerInicio } = await import('./obtenerInicio');
    await expect(obtenerInicio(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('recién llegado: sin equipos ni organizaciones', async () => {
    mockearDb({ equipos: [], organizaciones: [] });
    const { obtenerInicio } = await import('./obtenerInicio');
    const resultado = await obtenerInicio(undefined, contextoCon('usuario-1'));

    expect(resultado.esRecienLlegado).toBe(true);
    expect(resultado.esJugador).toBe(false);
    expect(resultado.esOrganizador).toBe(false);
    expect(resultado.jugador).toBeNull();
    expect(resultado.organizador).toBeNull();
  });

  it('jugador con próximo partido: arma el bloque con el rival y mi equipo bien distinguidos', async () => {
    mockearDb({
      equipos: [
        { id: 'eq-1', nombre: 'Los Pibes', categoria_genero: 'male', rol_equipo: 'captain' },
      ],
      organizaciones: [],
      partido: {
        torneo_id: 't-1',
        torneo_nombre: 'Copa Otoño',
        numero_fecha: 7,
        categoria_genero: 'male',
        equipo_local_id: 'eq-rival',
        equipo_local_nombre: 'San Martín FC',
        equipo_visitante_id: 'eq-1',
        equipo_visitante_nombre: 'Los Pibes',
        fecha_hora_programada: new Date('2026-04-12T20:30:00Z'),
        sede_nombre: 'Cancha 1',
      },
      resultadosPorConfirmar: 1,
    });
    const { obtenerInicio } = await import('./obtenerInicio');
    const resultado = await obtenerInicio(undefined, contextoCon('usuario-1'));

    expect(resultado.esJugador).toBe(true);
    expect(resultado.esRecienLlegado).toBe(false);
    expect(resultado.jugador?.proximoPartido).toEqual({
      torneoId: 't-1',
      torneoNombre: 'Copa Otoño',
      numeroFecha: 7,
      categoriaGenero: 'male',
      miEquipoId: 'eq-1',
      miEquipoNombre: 'Los Pibes',
      rivalId: 'eq-rival',
      rivalNombre: 'San Martín FC',
      fechaHoraProgramada: '2026-04-12T20:30:00.000Z',
      sedeNombre: 'Cancha 1',
    });
    expect(resultado.jugador?.resultadosPorConfirmar).toBe(1);
  });

  it('organizador: arma torneos administrados y cuenta pendientes', async () => {
    mockearDb({
      equipos: [],
      organizaciones: [{ organizacion_id: 'org-1' }],
      torneosAdministrados: [
        {
          id: 'tor-1',
          nombre: 'Copa Otoño F5',
          categoria_genero: 'male',
          modalidad: 'f5',
          estado: 'in_progress',
          fecha_inicio_estimada: new Date('2026-04-12T00:00:00Z'),
          cupo_equipos: 16,
          inscriptos: '12',
        },
      ],
      inscripcionesPendientes: 2,
      resultadosSinCargar: 3,
    });
    const { obtenerInicio } = await import('./obtenerInicio');
    const resultado = await obtenerInicio(undefined, contextoCon('usuario-1'));

    expect(resultado.esOrganizador).toBe(true);
    expect(resultado.organizador?.torneosAdministrados).toEqual([
      {
        id: 'tor-1',
        nombre: 'Copa Otoño F5',
        categoriaGenero: 'male',
        modalidad: 'f5',
        estado: 'in_progress',
        fechaInicioEstimada: '2026-04-12T00:00:00.000Z',
        inscriptos: 12,
        cupoEquipos: 16,
      },
    ]);
    expect(resultado.organizador?.inscripcionesPendientes).toBe(2);
    expect(resultado.organizador?.resultadosSinCargar).toBe(3);
  });

  it('sin perfil deportivo, NO_ENCONTRADO', async () => {
    mockearDb({ perfil: null });
    const { obtenerInicio } = await import('./obtenerInicio');
    await expect(obtenerInicio(undefined, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
