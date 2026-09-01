import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoSistema: Contexto = { usuarioId: null, permisos: {}, esSistema: true };

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  seguidoresPorEntidad?: Record<string, string[]>;
  capturarInsert?: (texto: string, valores: unknown[]) => void;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        if (texto.includes('FROM seguimiento')) {
          const entidadId = valores[1] as string;
          const usuarioIds = opciones.seguidoresPorEntidad?.[entidadId] ?? [];
          return { rows: usuarioIds.map((usuario_id) => ({ usuario_id })) };
        }
        if (texto.includes('INSERT INTO notificacion')) {
          opciones.capturarInsert?.(texto, valores);
          return { rows: [] };
        }
        throw new Error(`consulta inesperada: ${texto}`);
      },
    }),
  }));
}

describe('notificar', () => {
  it('una notificación accionable registra dos filas por destinatario, una por canal', async () => {
    const inserts: unknown[][] = [];
    mockearDb({ capturarInsert: (_t, v) => inserts.push(v) });
    const { notificar } = await import('./notificar');

    await notificar(
      {
        tipo: 'team_invitation',
        destinatarios: { usuarioIds: ['77777777-7777-7777-7777-777777777777'] },
      },
      contextoSistema,
    );

    expect(inserts).toHaveLength(1);
    const valores = inserts[0]!;
    // 5 columnas x 2 canales = 10 valores
    expect(valores).toHaveLength(10);
    expect(valores).toContain('in_app');
    expect(valores).toContain('email');
  });

  it('una notificación informativa registra una sola fila, por push (in_app)', async () => {
    const inserts: unknown[][] = [];
    mockearDb({ capturarInsert: (_t, v) => inserts.push(v) });
    const { notificar } = await import('./notificar');

    await notificar(
      {
        tipo: 'tournament_published',
        destinatarios: { usuarioIds: ['77777777-7777-7777-7777-777777777777'] },
      },
      contextoSistema,
    );

    const valores = inserts[0]!;
    expect(valores).toHaveLength(5);
    expect(valores).toContain('in_app');
    expect(valores).not.toContain('email');
  });

  it('resuelve destinatarios adicionales a partir de los seguidores de una entidad', async () => {
    const inserts: unknown[][] = [];
    mockearDb({
      seguidoresPorEntidad: {
        '11111111-1111-1111-1111-111111111111': [
          '55555555-5555-5555-5555-555555555555',
          '66666666-6666-6666-6666-666666666666',
        ],
      },
      capturarInsert: (_t, v) => inserts.push(v),
    });
    const { notificar } = await import('./notificar');

    await notificar(
      {
        tipo: 'match_rescheduled',
        destinatarios: {
          usuarioIds: [
            '33333333-3333-3333-3333-333333333333',
            '44444444-4444-4444-4444-444444444444',
          ],
          seguidoresDe: [
            { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
          ],
        },
      },
      contextoSistema,
    );

    const valores = inserts[0]!;
    // 4 destinatarios (2 explícitos + 2 seguidores) x 2 canales (accionable) = 40 valores
    expect(valores).toHaveLength(40);
  });

  it('deduplica un destinatario que además sigue la entidad de origen', async () => {
    const inserts: unknown[][] = [];
    mockearDb({
      seguidoresPorEntidad: {
        '11111111-1111-1111-1111-111111111111': ['77777777-7777-7777-7777-777777777777'],
      },
      capturarInsert: (_t, v) => inserts.push(v),
    });
    const { notificar } = await import('./notificar');

    await notificar(
      {
        tipo: 'tournament_cancelled',
        destinatarios: {
          usuarioIds: ['77777777-7777-7777-7777-777777777777'],
          seguidoresDe: [
            { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
          ],
        },
      },
      contextoSistema,
    );

    // 1 solo destinatario (deduplicado) x 2 canales = 10 valores
    expect(inserts[0]).toHaveLength(10);
  });

  it('sin destinatarios, no inserta nada', async () => {
    const inserts: unknown[][] = [];
    mockearDb({ capturarInsert: (_t, v) => inserts.push(v) });
    const { notificar } = await import('./notificar');

    await notificar({ tipo: 'team_invitation', destinatarios: {} }, contextoSistema);

    expect(inserts).toHaveLength(0);
  });
});
