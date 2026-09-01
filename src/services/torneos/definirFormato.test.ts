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

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  hayPartidosJugados?: boolean;
  estadoTorneo?: string;
}) {
  let contadorFase = 0;
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.startsWith('SELECT estado FROM torneo')) {
          return { rows: [{ estado: opciones.estadoTorneo ?? 'draft' }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.includes('FROM partido WHERE torneo_id')) {
          return { rows: opciones.hayPartidosJugados ? [{}] : [] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim());
          if (texto.trim().startsWith('INSERT INTO fase')) {
            contadorFase += 1;
            return { rows: [{ id: `fase-${contadorFase}` }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

function mockearNotificarCambio() {
  const spy = vi.fn(async () => {});
  vi.doMock('./_notificarCambio', () => ({ notificarCambioDeTorneo: spy }));
  return spy;
}

describe('definirFormato', () => {
  it('liga: queda creada una fase con un único grupo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { definirFormato } = await import('./definirFormato');

    const resultado = await definirFormato(
      { torneoId: TORNEO, formato: 'league' },
      contextoCon('usuario-1'),
    );

    expect(resultado.fases).toEqual([
      { id: 'fase-1', tipoFase: 'league', orden: 1, grupos: ['Grupo único'] },
    ]);
  });

  it('eliminación directa: también una fase con un único grupo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { definirFormato } = await import('./definirFormato');

    const resultado = await definirFormato(
      { torneoId: TORNEO, formato: 'knockout' },
      contextoCon('usuario-1'),
    );

    expect(resultado.fases).toEqual([
      { id: 'fase-1', tipoFase: 'knockout', orden: 1, grupos: ['Grupo único'] },
    ]);
  });

  it('grupos + eliminatoria: crea las fases en orden y los grupos de la primera', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { definirFormato } = await import('./definirFormato');

    const resultado = await definirFormato(
      { torneoId: TORNEO, formato: 'groups_knockout', cantidadZonas: 3, clasificadosPorZona: 2 },
      contextoCon('usuario-1'),
    );

    expect(resultado.fases).toEqual([
      { id: 'fase-1', tipoFase: 'league', orden: 1, grupos: ['Zona A', 'Zona B', 'Zona C'] },
      { id: 'fase-2', tipoFase: 'knockout', orden: 2, grupos: [] },
    ]);
  });

  it('con partidos ya jugados, se rechaza con TORNEO_YA_EMPEZADO', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', hayPartidosJugados: true });
    const { definirFormato } = await import('./definirFormato');
    await expect(
      definirFormato({ torneoId: TORNEO, formato: 'league' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TORNEO_YA_EMPEZADO' });
  });

  it('redefinir el formato borra la estructura anterior antes de crear la nueva', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { definirFormato } = await import('./definirFormato');

    await definirFormato({ torneoId: TORNEO, formato: 'league' }, contextoCon('usuario-1'));

    expect(consultas[0]).toBe('BEGIN');
    expect(consultas.some((c) => c.startsWith('DELETE FROM grupo'))).toBe(true);
    expect(consultas.some((c) => c.startsWith('DELETE FROM fase'))).toBe(true);
    expect(consultas.at(-1)).toBe('COMMIT');
  });

  it('un colaborador no puede definir el formato', async () => {
    mockearDb({});
    const { definirFormato } = await import('./definirFormato');
    await expect(
      definirFormato({ torneoId: TORNEO, formato: 'league' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('groups_knockout sin cantidadZonas, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { definirFormato } = await import('./definirFormato');
    await expect(
      // @ts-expect-error entrada deliberadamente inválida
      definirFormato({ torneoId: TORNEO, formato: 'groups_knockout' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('redefinir el formato de un torneo publicado notifica (D-22b)', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'registration_open' });
    const notificarCambio = mockearNotificarCambio();
    const { definirFormato } = await import('./definirFormato');

    await definirFormato({ torneoId: TORNEO, formato: 'league' }, contextoCon('usuario-1'));

    expect(notificarCambio).toHaveBeenCalledWith(
      TORNEO,
      'tournament_rules_updated',
      expect.anything(),
    );
  });

  it('definir el formato de un torneo en draft no notifica', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'draft' });
    const notificarCambio = mockearNotificarCambio();
    const { definirFormato } = await import('./definirFormato');

    await definirFormato({ torneoId: TORNEO, formato: 'league' }, contextoCon('usuario-1'));

    expect(notificarCambio).not.toHaveBeenCalled();
  });
});
