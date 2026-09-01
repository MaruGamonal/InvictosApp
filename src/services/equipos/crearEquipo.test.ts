import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { perfilId?: string | null; duplicado?: boolean }) {
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('FROM equipo WHERE lower')) {
          return { rows: opciones.duplicado ? [{}] : [] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim().toUpperCase());
          if (texto.trim().toUpperCase().startsWith('INSERT INTO EQUIPO')) {
            return { rows: [{ id: 'equipo-nuevo' }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('crearEquipo', () => {
  it('crea el equipo y a quien lo crea como capitán', async () => {
    const consultas = mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111' });
    const { crearEquipo } = await import('./crearEquipo');

    const resultado = await crearEquipo(
      { nombre: 'Los Pibes FC', categoriaGenero: 'male' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ id: 'equipo-nuevo', advertenciaNombreDuplicado: false });
    expect(consultas.some((c) => c.startsWith('INSERT INTO INTEGRANTE_EQUIPO'))).toBe(true);
    expect(consultas.at(-1)).toBe('COMMIT');
  });

  it('avisa sin bloquear si ya existe un equipo con el mismo nombre en la misma ciudad', async () => {
    mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111', duplicado: true });
    const { crearEquipo } = await import('./crearEquipo');

    const resultado = await crearEquipo(
      {
        nombre: 'Los Pibes FC',
        categoriaGenero: 'male',
        ciudadId: '11111111-1111-1111-1111-111111111111',
      },
      contextoCon('usuario-1'),
    );

    expect(resultado.advertenciaNombreDuplicado).toBe(true);
  });

  it('rechaza sin categoría de género (obligatoria, sin default — D-81)', async () => {
    mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111' });
    const { crearEquipo } = await import('./crearEquipo');

    await expect(
      // @ts-expect-error entrada deliberadamente inválida
      crearEquipo({ nombre: 'Los Pibes FC' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { crearEquipo } = await import('./crearEquipo');
    await expect(
      crearEquipo({ nombre: 'Los Pibes FC', categoriaGenero: 'male' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
