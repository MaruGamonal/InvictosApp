import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string;
  equipoIds?: string[];
  inscripciones?: Array<{
    equipo_id: string;
    equipo_nombre: string;
    estado: string;
    advertencia_categoria: boolean;
  }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (sql.includes('DISTINCT equipo_id')) {
          return { rows: (opciones.equipoIds ?? []).map((equipo_id) => ({ equipo_id })) };
        }
        return { rows: opciones.inscripciones ?? [] };
      },
    }),
  }));
}

const TORNEO_ID = '11111111-1111-1111-1111-111111111111';

describe('obtenerMiInscripcionEnTorneo', () => {
  it('sin sesión, lista vacía (no es un error)', async () => {
    mockearDb({});
    const { obtenerMiInscripcionEnTorneo } = await import('./obtenerMiInscripcionEnTorneo');
    const resultado = await obtenerMiInscripcionEnTorneo({ torneoId: TORNEO_ID }, contextoCon(null));
    expect(resultado).toEqual([]);
  });

  it('con sesión pero sin perfil deportivo, lista vacía', async () => {
    mockearDb({});
    const { obtenerMiInscripcionEnTorneo } = await import('./obtenerMiInscripcionEnTorneo');
    const resultado = await obtenerMiInscripcionEnTorneo(
      { torneoId: TORNEO_ID },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual([]);
  });

  it('con perfil pero sin equipos gestionables, lista vacía', async () => {
    mockearDb({ perfilId: 'perfil-1', equipoIds: [] });
    const { obtenerMiInscripcionEnTorneo } = await import('./obtenerMiInscripcionEnTorneo');
    const resultado = await obtenerMiInscripcionEnTorneo(
      { torneoId: TORNEO_ID },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual([]);
  });

  it('con equipos gestionables pero ninguno inscripto en este torneo, lista vacía', async () => {
    mockearDb({ perfilId: 'perfil-1', equipoIds: ['equipo-1'], inscripciones: [] });
    const { obtenerMiInscripcionEnTorneo } = await import('./obtenerMiInscripcionEnTorneo');
    const resultado = await obtenerMiInscripcionEnTorneo(
      { torneoId: TORNEO_ID },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual([]);
  });

  it('devuelve la inscripción vigente de mi equipo, con su estado', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      equipoIds: ['equipo-1'],
      inscripciones: [
        {
          equipo_id: 'equipo-1',
          equipo_nombre: 'Los Pibes',
          estado: 'pending',
          advertencia_categoria: false,
        },
      ],
    });
    const { obtenerMiInscripcionEnTorneo } = await import('./obtenerMiInscripcionEnTorneo');
    const resultado = await obtenerMiInscripcionEnTorneo(
      { torneoId: TORNEO_ID },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual([
      {
        equipoId: 'equipo-1',
        equipoNombre: 'Los Pibes',
        estado: 'pending',
        advertenciaCategoria: false,
      },
    ]);
  });
});
