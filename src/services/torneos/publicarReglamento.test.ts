import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';

const notificarCambio = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  notificarCambio.mockClear();
  vi.doMock('./_notificarCambio', () => ({ notificarCambioDeTorneo: notificarCambio }));
});

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  maxVersionExistente?: number;
}) {
  const consultasCliente: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string, valores: unknown[] = []) => {
          consultasCliente.push({ texto: texto.trim(), valores });
          if (texto.includes('max(numero_version)')) {
            return { rows: [{ max: opciones.maxVersionExistente ?? null }] };
          }
          if (texto.trim().startsWith('INSERT INTO reglamento')) {
            return { rows: [{ id: 'reglamento-nuevo' }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('publicarReglamento', () => {
  it('el primer reglamento de un torneo queda como versión 1', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { publicarReglamento } = await import('./publicarReglamento');

    const resultado = await publicarReglamento(
      { torneoId: TORNEO, texto: 'Reglamento base' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ id: 'reglamento-nuevo', numeroVersion: 1 });
    expect(notificarCambio).toHaveBeenCalledWith(
      TORNEO,
      'tournament_rules_updated',
      expect.anything(),
    );
  });

  it('una nueva versión toma el número siguiente y pasa la anterior a superseded', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner', maxVersionExistente: 2 });
    const { publicarReglamento } = await import('./publicarReglamento');

    const resultado = await publicarReglamento(
      { torneoId: TORNEO, texto: 'Reglamento v3' },
      contextoCon('usuario-1'),
    );

    expect(resultado.numeroVersion).toBe(3);
    expect(consultas.some((c) => c.texto.startsWith('UPDATE reglamento'))).toBe(true);
  });

  it('acepta un reglamento solo con archivo, sin texto', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { publicarReglamento } = await import('./publicarReglamento');
    await expect(
      publicarReglamento(
        { torneoId: TORNEO, archivoUrl: 'https://ejemplo.com/reglamento.pdf' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toMatchObject({ numeroVersion: 1 });
  });

  it('sin texto ni archivo, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { publicarReglamento } = await import('./publicarReglamento');
    await expect(
      publicarReglamento({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un colaborador no puede publicar el reglamento', async () => {
    mockearDb({});
    const { publicarReglamento } = await import('./publicarReglamento');
    await expect(
      publicarReglamento({ torneoId: TORNEO, texto: 'X' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { publicarReglamento } = await import('./publicarReglamento');
    await expect(
      publicarReglamento({ torneoId: TORNEO, texto: 'X' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
