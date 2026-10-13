import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const TORNEO = '11111111-1111-1111-1111-111111111111';
const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  estado?: string;
  inscripciones?: number;
  partidos?: number;
  rolOrganizacion?: 'owner' | 'admin';
}) {
  const consultas: Array<{ texto: string; valores: unknown[] }> = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        consultas.push({ texto, valores });
        if (texto.includes('SELECT organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: 'org-1' }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('SELECT estado FROM torneo')) {
          return { rows: opciones.estado ? [{ estado: opciones.estado }] : [] };
        }
        if (texto.includes('AS inscripciones')) {
          return {
            rows: [
              {
                inscripciones: String(opciones.inscripciones ?? 0),
                partidos: String(opciones.partidos ?? 0),
              },
            ],
          };
        }
        return { rows: [] };
      },
    }),
  }));
  vi.doMock('@/lib/cache', () => ({
    invalidarCacheTorneo: vi.fn(),
    invalidarCacheEquipo: vi.fn(),
  }));
  return consultas;
}

describe('despublicarTorneo', () => {
  it('sin permiso sobre el torneo, SIN_PERMISO', async () => {
    mockearDb({ estado: 'registration_open' });
    const { despublicarTorneo } = await import('./despublicarTorneo');
    await expect(
      despublicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin equipos ni partidos, vuelve a borrador', async () => {
    const consultas = mockearDb({ estado: 'registration_open', rolOrganizacion: 'owner' });
    const { despublicarTorneo } = await import('./despublicarTorneo');

    const resultado = await despublicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado).toEqual({ estado: 'draft' });

    const update = consultas.find((c) => c.texto.includes('UPDATE torneo'))!;
    expect(update.texto).toContain("estado = 'draft'");
    // Un borrador no se descubre (D-21b), y al republicarse la
    // visibilidad la vuelve a decidir `publicarTorneo` según la
    // verificación de la organización.
    expect(update.texto).toContain("visibilidad = 'unlisted'");
    expect(update.texto).toContain('fecha_publicacion = NULL');
    expect(update.texto).toContain('version = version + 1');
  });

  /**
   * Con equipos anotados, volver a borrador les sacaría el torneo de
   * encima sin explicación. El mensaje del error nombra las salidas que
   * sí existen.
   */
  it('con equipos anotados, TORNEO_YA_TIENE_EQUIPOS', async () => {
    mockearDb({ estado: 'registration_open', rolOrganizacion: 'owner', inscripciones: 1 });
    const { despublicarTorneo } = await import('./despublicarTorneo');
    await expect(
      despublicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TORNEO_YA_TIENE_EQUIPOS' });
  });

  it('con fixture generado, tampoco', async () => {
    mockearDb({ estado: 'registration_open', rolOrganizacion: 'owner', partidos: 6 });
    const { despublicarTorneo } = await import('./despublicarTorneo');
    await expect(
      despublicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TORNEO_YA_TIENE_EQUIPOS' });
  });

  /** Más adelante no sería deshacer la publicación sino borrar un torneo que ocurrió. */
  it.each(['registration_closed', 'in_progress', 'finished', 'draft'])(
    'desde %s no se puede',
    async (estado) => {
      mockearDb({ estado, rolOrganizacion: 'owner' });
      const { despublicarTorneo } = await import('./despublicarTorneo');
      await expect(
        despublicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
      ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
    },
  );

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ rolOrganizacion: 'owner' });
    const { despublicarTorneo } = await import('./despublicarTorneo');
    await expect(
      despublicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
