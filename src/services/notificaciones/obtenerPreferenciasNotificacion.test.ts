import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const USUARIO: Contexto = { usuarioId: '11111111-1111-1111-1111-111111111111', permisos: {}, esSistema: false };
const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

beforeEach(() => vi.resetModules());

function mockearDb(filas: Array<{ categoria: string; canal: string }>) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async () => ({ rows: filas }),
    }),
  }));
}

describe('obtenerPreferenciasNotificacion', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb([]);
    const { obtenerPreferenciasNotificacion } = await import('./obtenerPreferenciasNotificacion');
    await expect(obtenerPreferenciasNotificacion(undefined, VISITANTE)).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('sin ninguna fila apagada, devuelve las seis categorías todas activas', async () => {
    mockearDb([]);
    const { obtenerPreferenciasNotificacion } = await import('./obtenerPreferenciasNotificacion');

    const preferencias = await obtenerPreferenciasNotificacion(undefined, USUARIO);

    expect(preferencias).toHaveLength(6);
    expect(preferencias.every((p) => p.inAppActivo && p.emailActivo)).toBe(true);
  });

  it('distingue accionables de informativas', async () => {
    mockearDb([]);
    const { obtenerPreferenciasNotificacion } = await import('./obtenerPreferenciasNotificacion');

    const preferencias = await obtenerPreferenciasNotificacion(undefined, USUARIO);

    const porCategoria = Object.fromEntries(preferencias.map((p) => [p.categoria, p.accionable]));
    expect(porCategoria.team_invitation).toBe(true);
    expect(porCategoria.registration_status).toBe(true);
    expect(porCategoria.match_schedule).toBe(true);
    expect(porCategoria.followed_results).toBe(false);
    expect(porCategoria.tournament_started).toBe(false);
    expect(porCategoria.tournament_finished).toBe(false);
  });

  it('una fila apagada se refleja en esa categoría y canal puntual', async () => {
    mockearDb([{ categoria: 'match_schedule', canal: 'email' }]);
    const { obtenerPreferenciasNotificacion } = await import('./obtenerPreferenciasNotificacion');

    const preferencias = await obtenerPreferenciasNotificacion(undefined, USUARIO);

    const matchSchedule = preferencias.find((p) => p.categoria === 'match_schedule')!;
    expect(matchSchedule.emailActivo).toBe(false);
    expect(matchSchedule.inAppActivo).toBe(true);
  });
});
