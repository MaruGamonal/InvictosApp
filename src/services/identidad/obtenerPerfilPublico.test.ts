import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const PERFIL = '11111111-1111-1111-1111-111111111111';

function mockearDb(perfil: { usuario_id: string | null; visibilidad: 'public' | 'restricted' }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return {
            rows: [
              {
                id: PERFIL,
                usuario_id: perfil.usuario_id,
                nombre_visible: 'Juan Pérez',
                foto_url: 'https://ejemplo.com/foto.jpg',
                posicion: 'goalkeeper',
                ciudad_id: 'ciudad-1',
                visibilidad: perfil.visibilidad,
              },
            ],
          };
        }
        return {
          rows: [
            { id: 'equipo-1', nombre: 'Equipo A', escudo_url: null, categoria_genero: 'male' },
          ],
        };
      },
    }),
  }));
}

beforeEach(() => vi.resetModules());

describe('obtenerPerfilPublico', () => {
  it('un perfil público muestra todos sus datos', async () => {
    mockearDb({ usuario_id: 'dueño-1', visibilidad: 'public' });
    const { obtenerPerfilPublico } = await import('./obtenerPerfilPublico');
    const perfil = await obtenerPerfilPublico({ perfilId: PERFIL }, contextoCon(null));
    expect(perfil.fotoUrl).toBe('https://ejemplo.com/foto.jpg');
    expect(perfil.posicion).toBe('goalkeeper');
    vi.doUnmock('@/db/cliente');
  });

  it('un perfil restringido oculta foto/posición/ciudad para un visitante, pero nunca los equipos', async () => {
    mockearDb({ usuario_id: 'dueño-1', visibilidad: 'restricted' });
    const { obtenerPerfilPublico } = await import('./obtenerPerfilPublico');
    const perfil = await obtenerPerfilPublico({ perfilId: PERFIL }, contextoCon(null));

    expect(perfil.nombreVisible).toBe('Juan Pérez');
    expect(perfil.equipos).toEqual([
      { id: 'equipo-1', nombre: 'Equipo A', escudoUrl: null, categoriaGenero: 'male' },
    ]);
    expect(perfil.fotoUrl).toBeNull();
    expect(perfil.posicion).toBeNull();
    expect(perfil.ciudadId).toBeNull();
    vi.doUnmock('@/db/cliente');
  });

  it('el propio dueño ve su perfil restringido completo', async () => {
    mockearDb({ usuario_id: 'dueño-1', visibilidad: 'restricted' });
    const { obtenerPerfilPublico } = await import('./obtenerPerfilPublico');
    const perfil = await obtenerPerfilPublico({ perfilId: PERFIL }, contextoCon('dueño-1'));
    expect(perfil.fotoUrl).not.toBeNull();
    expect(perfil.posicion).not.toBeNull();
    vi.doUnmock('@/db/cliente');
  });

  it('perfil inexistente da NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { obtenerPerfilPublico } = await import('./obtenerPerfilPublico');
    await expect(
      obtenerPerfilPublico({ perfilId: PERFIL }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    vi.doUnmock('@/db/cliente');
  });
});
