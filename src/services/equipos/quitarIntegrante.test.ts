import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilPropioId?: string | null;
  rolesEnEquipo?: string[];
  capitanDelEquipo?: string;
  rowCountUpdate?: number;
  sigueHabilitadoEnTorneoEnCurso?: boolean;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilPropioId ? [{ id: opciones.perfilPropioId }] : [] };
        }
        if (texto.includes('perfil_capitan_id FROM equipo')) {
          return {
            rows: opciones.capitanDelEquipo
              ? [{ perfil_capitan_id: opciones.capitanDelEquipo }]
              : [],
          };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.startsWith('UPDATE integrante_equipo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        if (texto.includes('FROM integrante_habilitado')) {
          return { rows: opciones.sigueHabilitadoEnTorneoEnCurso ? [{}] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('quitarIntegrante', () => {
  it('un jugador se da de baja a sí mismo, sin intervención del capitán', async () => {
    mockearDb({
      perfilPropioId: '55555555-5555-5555-5555-555555555555',
      capitanDelEquipo: '22222222-2222-2222-2222-222222222222',
    });
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '55555555-5555-5555-5555-555555555555',
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ advertenciaSigueHabilitadoEnTorneo: false });
  });

  it('el capitán quita a otro integrante del plantel', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      capitanDelEquipo: '22222222-2222-2222-2222-222222222222',
    });
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ advertenciaSigueHabilitadoEnTorneo: false });
  });

  it('un delegado no puede quitar a otro integrante (exclusivo del capitán)', async () => {
    mockearDb({
      perfilPropioId: '33333333-3333-3333-3333-333333333333',
      rolesEnEquipo: ['delegate'],
    });
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('el capitán no puede quitarse sin designar reemplazo', async () => {
    mockearDb({
      perfilPropioId: '22222222-2222-2222-2222-222222222222',
      capitanDelEquipo: '22222222-2222-2222-2222-222222222222',
    });
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '22222222-2222-2222-2222-222222222222',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'CAPITAN_SIN_REEMPLAZO' });
  });

  it('sigue habilitado en un torneo en curso: la baja se aplica igual, con advertencia (D-18b)', async () => {
    mockearDb({
      perfilPropioId: '55555555-5555-5555-5555-555555555555',
      capitanDelEquipo: '22222222-2222-2222-2222-222222222222',
      sigueHabilitadoEnTorneoEnCurso: true,
    });
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '55555555-5555-5555-5555-555555555555',
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ advertenciaSigueHabilitadoEnTorneo: true });
  });

  it('sin vínculo activo que dar de baja, NO_ENCONTRADO', async () => {
    mockearDb({
      perfilPropioId: '55555555-5555-5555-5555-555555555555',
      capitanDelEquipo: '22222222-2222-2222-2222-222222222222',
      rowCountUpdate: 0,
    });
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '55555555-5555-5555-5555-555555555555',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { quitarIntegrante } = await import('./quitarIntegrante');
    await expect(
      quitarIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '55555555-5555-5555-5555-555555555555',
        },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
