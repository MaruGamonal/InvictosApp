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
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  estadoTorneo?: string;
  categoriaTorneo?: string;
  categoriaEquipo?: string;
  admiteListaEspera?: boolean;
  aprobados?: number;
  cupoEquipos?: number;
  reglamentoVigente?: number;
  certamenId?: string | null;
  otraDivisionInscripta?: boolean;
  inscripcionExistente?: {
    estado: string;
    advertencia_categoria: boolean;
    advertencia_multiples_divisiones: boolean;
  };
  integrantes?: string[];
}) {
  const consultasCliente: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return {
            rows: (opciones.rolesEnEquipo ?? ['captain']).map((rol_equipo) => ({ rol_equipo })),
          };
        }
        if (texto.includes('SELECT estado, categoria_genero, cupo_equipos, admite_lista_espera')) {
          return {
            rows: [
              {
                estado: opciones.estadoTorneo ?? 'registration_open',
                categoria_genero: opciones.categoriaTorneo ?? 'male',
                cupo_equipos: opciones.cupoEquipos ?? 8,
                admite_lista_espera: opciones.admiteListaEspera ?? true,
                certamen_id: opciones.certamenId ?? null,
              },
            ],
          };
        }
        if (
          texto.startsWith('SELECT estado, advertencia_categoria, advertencia_multiples_divisiones')
        ) {
          return { rows: opciones.inscripcionExistente ? [opciones.inscripcionExistente] : [] };
        }
        if (texto.includes("estado = 'current'")) {
          return {
            rows: opciones.reglamentoVigente
              ? [{ numero_version: opciones.reglamentoVigente }]
              : [],
          };
        }
        if (texto.startsWith('SELECT categoria_genero FROM equipo')) {
          return { rows: [{ categoria_genero: opciones.categoriaEquipo ?? 'male' }] };
        }
        if (texto.includes('FROM inscripcion i\n       JOIN torneo t')) {
          return { rows: opciones.otraDivisionInscripta ? [{ '?column?': 1 }] : [] };
        }
        if (texto.includes("estado = 'approved'")) {
          return { rows: [{ count: String(opciones.aprobados ?? 0) }] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push({ texto: texto.trim(), valores: [] });
          if (texto.trim().startsWith('SELECT pd.usuario_id')) {
            return {
              rows: (opciones.integrantes ?? ['usuario-1']).map((usuario_id) => ({ usuario_id })),
            };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('solicitarInscripcion', () => {
  it('sin reglamento, inscribe directo en pending', async () => {
    mockearDb({ perfilId: 'perfil-1' });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    const resultado = await solicitarInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({
      estado: 'pending',
      advertenciaCategoria: false,
      advertenciaMultiplesDivisiones: false,
    });
  });

  it('con reglamento vigente y sin aceptarlo, REGLAMENTO_NO_ACEPTADO', async () => {
    mockearDb({ perfilId: 'perfil-1', reglamentoVigente: 2 });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'REGLAMENTO_NO_ACEPTADO' });
  });

  it('aceptando la versión vigente exacta, inscribe', async () => {
    mockearDb({ perfilId: 'perfil-1', reglamentoVigente: 2 });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion(
        { torneoId: TORNEO, equipoId: EQUIPO, aceptoReglamentoVersion: 2 },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({
      estado: 'pending',
      advertenciaCategoria: false,
      advertenciaMultiplesDivisiones: false,
    });
  });

  it('con el torneo cerrado, INSCRIPCIONES_CERRADAS', async () => {
    mockearDb({ perfilId: 'perfil-1', estadoTorneo: 'registration_closed' });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'INSCRIPCIONES_CERRADAS' });
  });

  it('con una inscripción vigente ya existente, devuelve la existente', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      inscripcionExistente: {
        estado: 'approved',
        advertencia_categoria: false,
        advertencia_multiples_divisiones: true,
      },
    });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).resolves.toEqual({
      estado: 'approved',
      advertenciaCategoria: false,
      advertenciaMultiplesDivisiones: true,
    });
  });

  it('con el cupo lleno y lista de espera habilitada, queda waitlisted', async () => {
    mockearDb({ perfilId: 'perfil-1', aprobados: 8, cupoEquipos: 8, admiteListaEspera: true });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).resolves.toEqual({
      estado: 'waitlisted',
      advertenciaCategoria: false,
      advertenciaMultiplesDivisiones: false,
    });
  });

  it('con el cupo lleno y sin lista de espera, CUPO_COMPLETO', async () => {
    mockearDb({ perfilId: 'perfil-1', aprobados: 8, cupoEquipos: 8, admiteListaEspera: false });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'CUPO_COMPLETO' });
  });

  it('avisa cuando la categoría del equipo no coincide con la del torneo', async () => {
    mockearDb({ perfilId: 'perfil-1', categoriaTorneo: 'female', categoriaEquipo: 'male' });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    const resultado = await solicitarInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado.advertenciaCategoria).toBe(true);
  });

  it('un torneo mixto nunca avisa por categoría', async () => {
    mockearDb({ perfilId: 'perfil-1', categoriaTorneo: 'mixed', categoriaEquipo: 'female' });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    const resultado = await solicitarInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado.advertenciaCategoria).toBe(false);
  });

  it('avisa (no bloquea) si el equipo ya está inscripto en otra división del mismo certamen', async () => {
    mockearDb({ perfilId: 'perfil-1', certamenId: 'certamen-1', otraDivisionInscripta: true });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    const resultado = await solicitarInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado.estado).toBe('pending');
    expect(resultado.advertenciaMultiplesDivisiones).toBe(true);
  });

  it('un torneo sin certamen nunca avisa por múltiples divisiones', async () => {
    mockearDb({ perfilId: 'perfil-1', certamenId: null });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    const resultado = await solicitarInscripcion(
      { torneoId: TORNEO, equipoId: EQUIPO },
      contextoCon('usuario-1'),
    );
    expect(resultado.advertenciaMultiplesDivisiones).toBe(false);
  });

  it('un jugador sin más roles no puede inscribir al equipo', async () => {
    mockearDb({ perfilId: 'perfil-1', rolesEnEquipo: ['player'] });
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { solicitarInscripcion } = await import('./solicitarInscripcion');
    await expect(
      solicitarInscripcion({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
