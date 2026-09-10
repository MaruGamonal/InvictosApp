import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string;
  filas?: Array<{ equipo_nombre: string; escudo_url: string | null; rol_equipo: string }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        return { rows: opciones.filas ?? [] };
      },
    }),
  }));
}

describe('obtenerMiInvitacionPendiente', () => {
  it('sin sesión, null (no es un error, es que no hay nada que responder)', async () => {
    mockearDb({});
    const { obtenerMiInvitacionPendiente } = await import('./obtenerMiInvitacionPendiente');
    const resultado = await obtenerMiInvitacionPendiente(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon(null),
    );
    expect(resultado).toBeNull();
  });

  it('con sesión pero sin perfil deportivo, null', async () => {
    mockearDb({});
    const { obtenerMiInvitacionPendiente } = await import('./obtenerMiInvitacionPendiente');
    const resultado = await obtenerMiInvitacionPendiente(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toBeNull();
  });

  it('con perfil pero sin vínculo invited en ese equipo, null', async () => {
    mockearDb({ perfilId: 'perfil-1', filas: [] });
    const { obtenerMiInvitacionPendiente } = await import('./obtenerMiInvitacionPendiente');
    const resultado = await obtenerMiInvitacionPendiente(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toBeNull();
  });

  it('con vínculo invited, devuelve el equipo y el/los rol/es propuestos', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      filas: [{ equipo_nombre: 'Defemi', escudo_url: 'https://ejemplo.com/escudo.png', rol_equipo: 'player' }],
    });
    const { obtenerMiInvitacionPendiente } = await import('./obtenerMiInvitacionPendiente');
    const resultado = await obtenerMiInvitacionPendiente(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({
      equipoNombre: 'Defemi',
      escudoUrl: 'https://ejemplo.com/escudo.png',
      roles: ['player'],
    });
  });

  it('con más de un rol propuesto, junta todos', async () => {
    mockearDb({
      perfilId: 'perfil-1',
      filas: [
        { equipo_nombre: 'Defemi', escudo_url: null, rol_equipo: 'player' },
        { equipo_nombre: 'Defemi', escudo_url: null, rol_equipo: 'delegate' },
      ],
    });
    const { obtenerMiInvitacionPendiente } = await import('./obtenerMiInvitacionPendiente');
    const resultado = await obtenerMiInvitacionPendiente(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado?.roles).toEqual(['player', 'delegate']);
  });
});
