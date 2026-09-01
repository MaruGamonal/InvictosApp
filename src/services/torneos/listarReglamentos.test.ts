import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { estadoTorneo?: string; rolEnOrganizacion?: 'owner' | 'admin' }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id, estado FROM torneo')) {
          return {
            rows: [
              {
                id: TORNEO,
                organizacion_id: ORG,
                estado: opciones.estadoTorneo ?? 'registration_open',
              },
            ],
          };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.includes('FROM reglamento r')) {
          return {
            rows: [
              {
                numero_version: 2,
                texto: 'Reglamento v2',
                archivo_url: null,
                estado: 'current',
                fecha_publicacion: new Date('2026-02-01T00:00:00Z'),
                publicado_por: 'Titular Uno',
              },
              {
                numero_version: 1,
                texto: 'Reglamento v1',
                archivo_url: null,
                estado: 'superseded',
                fecha_publicacion: new Date('2026-01-01T00:00:00Z'),
                publicado_por: 'Titular Uno',
              },
            ],
          };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('listarReglamentos', () => {
  it('un torneo publicado se puede consultar sin sesión', async () => {
    mockearDb({ estadoTorneo: 'registration_open' });
    const { listarReglamentos } = await import('./listarReglamentos');
    const resultado = await listarReglamentos({ torneoId: TORNEO }, contextoCon(null));
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({ numeroVersion: 2, estado: 'current' });
    expect(resultado[1]).toMatchObject({ numeroVersion: 1, estado: 'superseded' });
  });

  it('un torneo en draft solo lo ve quien administra la organización', async () => {
    mockearDb({ estadoTorneo: 'draft' });
    const { listarReglamentos } = await import('./listarReglamentos');
    await expect(listarReglamentos({ torneoId: TORNEO }, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('un administrador de la organización sí puede ver el reglamento de un torneo en draft', async () => {
    mockearDb({ estadoTorneo: 'draft', rolEnOrganizacion: 'admin' });
    const { listarReglamentos } = await import('./listarReglamentos');
    await expect(
      listarReglamentos({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).resolves.toHaveLength(2);
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { listarReglamentos } = await import('./listarReglamentos');
    await expect(listarReglamentos({ torneoId: TORNEO }, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
