import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const EQUIPO = '33333333-3333-3333-3333-333333333333';
const GRUPO = '44444444-4444-4444-4444-444444444444';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  grupoId?: string | null;
  puntosResultantes?: { puntos: number; ajuste_puntos: number };
}) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        consultas.push({ texto: t, valores });
        if (t.includes('organizacion_id FROM torneo')) return { rows: [{ organizacion_id: ORG }] };
        if (t.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (t.includes('FROM colaborador_torneo')) return { rows: [] };
        if (t.startsWith('SELECT grupo_id FROM inscripcion')) {
          return {
            rows: [{ grupo_id: opciones.grupoId === undefined ? GRUPO : opciones.grupoId }],
          };
        }
        if (t.startsWith('INSERT INTO posicion')) {
          return { rows: [opciones.puntosResultantes ?? { puntos: 3, ajuste_puntos: -3 }] };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('ajustarPuntos', () => {
  it('una quita de tres puntos por sanción se escribe en ajuste_puntos, no en puntos', async () => {
    const consultas = mockearDb({ rolEnOrganizacion: 'owner' });
    const { ajustarPuntos } = await import('./ajustarPuntos');

    const resultado = await ajustarPuntos(
      { torneoId: TORNEO, equipoId: EQUIPO, ajuste: -3, motivo: 'Sanción disciplinaria' },
      contextoCon('usuario-organizador'),
    );

    expect(resultado).toEqual({ grupoId: GRUPO, equipoId: EQUIPO, puntos: 3, ajustePuntos: -3 });
    const insert = consultas.find((c) => c.texto.startsWith('INSERT INTO posicion'));
    expect(insert!.texto).not.toMatch(/\bSET puntos =/);
    expect(insert!.valores).toEqual([
      GRUPO,
      EQUIPO,
      -3,
      'Sanción disciplinaria',
      'usuario-organizador',
    ]);
  });

  it('un colaborador no puede ajustar puntos', async () => {
    mockearDb({});
    const { ajustarPuntos } = await import('./ajustarPuntos');
    await expect(
      ajustarPuntos(
        { torneoId: TORNEO, equipoId: EQUIPO, ajuste: -3, motivo: 'x' },
        contextoCon('usuario-colaborador'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('un equipo sin tabla asignada todavía: DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', grupoId: null });
    const { ajustarPuntos } = await import('./ajustarPuntos');
    await expect(
      ajustarPuntos(
        { torneoId: TORNEO, equipoId: EQUIPO, ajuste: -3, motivo: 'x' },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un ajuste de cero es inválido', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { ajustarPuntos } = await import('./ajustarPuntos');
    await expect(
      ajustarPuntos(
        { torneoId: TORNEO, equipoId: EQUIPO, ajuste: 0, motivo: 'x' },
        contextoCon('usuario-organizador'),
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
