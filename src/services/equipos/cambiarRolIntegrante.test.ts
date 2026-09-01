import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  yaIntegraElPlantel?: boolean;
  capitanActualId?: string;
}) {
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes("estado_vinculo = 'active'") && texto.includes('SELECT 1')) {
          return { rows: opciones.yaIntegraElPlantel ? [{}] : [] };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.includes('perfil_capitan_id FROM equipo')) {
          return {
            rows: opciones.capitanActualId ? [{ perfil_capitan_id: opciones.capitanActualId }] : [],
          };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim().toUpperCase());
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('cambiarRolIntegrante', () => {
  it('el capitán designa a un integrante existente como delegado', async () => {
    mockearDb({
      perfilId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      yaIntegraElPlantel: true,
    });
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');
    await expect(
      cambiarRolIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'delegate',
          accion: 'asignar',
        },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ ok: true });
  });

  it('no se puede designar delegado a quien no integra el plantel', async () => {
    mockearDb({
      perfilId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      yaIntegraElPlantel: false,
    });
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');
    await expect(
      cambiarRolIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'delegate',
          accion: 'asignar',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un delegado no puede designar roles (exclusivo del capitán)', async () => {
    mockearDb({ perfilId: '33333333-3333-3333-3333-333333333333', rolesEnEquipo: ['delegate'] });
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');
    await expect(
      cambiarRolIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'coach',
          accion: 'asignar',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('transfiere la capitanía: el vínculo del capitán anterior queda left y el nuevo active', async () => {
    const consultas = mockearDb({
      perfilId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      yaIntegraElPlantel: true,
      capitanActualId: '22222222-2222-2222-2222-222222222222',
    });
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');

    const resultado = await cambiarRolIntegrante(
      {
        equipoId: '11111111-1111-1111-1111-111111111111',
        perfilId: '77777777-7777-7777-7777-777777777777',
        rol: 'captain',
        accion: 'asignar',
      },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ ok: true });
    expect(consultas.some((c) => c.startsWith('UPDATE EQUIPO'))).toBe(true);
    expect(consultas.some((c) => c.includes("'LEFT'"))).toBe(true);
  });

  it('no se puede designar capitán a quien no integra el plantel', async () => {
    mockearDb({
      perfilId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      yaIntegraElPlantel: false,
    });
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');
    await expect(
      cambiarRolIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'captain',
          accion: 'asignar',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('el capitán no se puede "quitar" — se transfiere, no se elimina', async () => {
    mockearDb({ perfilId: '22222222-2222-2222-2222-222222222222', rolesEnEquipo: ['captain'] });
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');
    await expect(
      cambiarRolIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'captain',
          accion: 'quitar',
        },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { cambiarRolIntegrante } = await import('./cambiarRolIntegrante');
    await expect(
      cambiarRolIntegrante(
        {
          equipoId: '11111111-1111-1111-1111-111111111111',
          perfilId: '77777777-7777-7777-7777-777777777777',
          rol: 'delegate',
          accion: 'asignar',
        },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
