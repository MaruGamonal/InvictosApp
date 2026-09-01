import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const ORG = '11111111-1111-1111-1111-111111111111';
const CIUDAD = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin' }) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto, valores });
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.trim().startsWith('INSERT INTO torneo')) {
          return { rows: [{ id: 'torneo-nuevo', estado: 'draft' }] };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('crearTorneo', () => {
  it('un titular crea el torneo, que nace en draft', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { crearTorneo } = await import('./crearTorneo');

    const resultado = await crearTorneo(
      {
        organizacionId: ORG,
        nombre: 'Copa Amateur',
        modalidad: 'f5',
        categoriaGenero: 'male',
        ciudadId: CIUDAD,
        formato: 'league',
        cupoEquipos: 8,
      },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ id: 'torneo-nuevo', estado: 'draft' });
  });

  it('un administrador también puede crear torneos', async () => {
    mockearDb({ rolEnOrganizacion: 'admin' });
    const { crearTorneo } = await import('./crearTorneo');
    await expect(
      crearTorneo(
        {
          organizacionId: ORG,
          nombre: 'Copa Amateur',
          modalidad: 'f5',
          categoriaGenero: 'male',
          ciudadId: CIUDAD,
          formato: 'league',
          cupoEquipos: 8,
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toMatchObject({ estado: 'draft' });
  });

  it('quien no es miembro de la organización no puede crear torneos', async () => {
    mockearDb({});
    const { crearTorneo } = await import('./crearTorneo');
    await expect(
      crearTorneo(
        {
          organizacionId: ORG,
          nombre: 'Copa Amateur',
          modalidad: 'f5',
          categoriaGenero: 'male',
          ciudadId: CIUDAD,
          formato: 'league',
          cupoEquipos: 8,
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin cupo, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { crearTorneo } = await import('./crearTorneo');
    await expect(
      crearTorneo(
        // @ts-expect-error entrada deliberadamente inválida
        {
          organizacionId: ORG,
          nombre: 'Copa Amateur',
          modalidad: 'f5',
          categoriaGenero: 'male',
          ciudadId: CIUDAD,
          formato: 'league',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('solo pasa las columnas explícitamente elegidas, dejando el resto en su default de esquema', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { crearTorneo } = await import('./crearTorneo');

    await crearTorneo(
      {
        organizacionId: ORG,
        nombre: 'Copa Amateur',
        modalidad: 'f5',
        categoriaGenero: 'male',
        ciudadId: CIUDAD,
        formato: 'league',
        cupoEquipos: 8,
      },
      contextoCon('usuario-1'),
    );

    const insert = consultas.find((c) => c.texto.trim().startsWith('INSERT INTO torneo'));
    expect(insert?.texto).not.toContain('puntos_victoria');
    expect(insert?.texto).not.toContain('goles_walkover');
  });

  it('acepta la configuración avanzada explícita', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { crearTorneo } = await import('./crearTorneo');

    await crearTorneo(
      {
        organizacionId: ORG,
        nombre: 'Copa Amateur',
        modalidad: 'f5',
        categoriaGenero: 'male',
        ciudadId: CIUDAD,
        formato: 'league',
        cupoEquipos: 8,
        puntosVictoria: 2,
        criteriosDesempate: ['goals_for', 'goal_difference'],
      },
      contextoCon('usuario-1'),
    );

    const insert = consultas.find((c) => c.texto.trim().startsWith('INSERT INTO torneo'));
    expect(insert?.texto).toContain('puntos_victoria');
    expect(insert?.texto).toContain('criterios_desempate');
    expect(insert?.valores).toContain('["goals_for","goal_difference"]');
  });
});
