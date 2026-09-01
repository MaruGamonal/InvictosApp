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

const TORNEO_COMPLETO = {
  nombre: 'Copa Amateur',
  modalidad: 'f5',
  formato: 'league',
  ciudad_id: 'ciudad-1',
  direccion: 'Cancha 1',
  fecha_inicio_estimada: new Date('2026-05-01'),
  cupo_equipos: 8,
  estado: 'draft',
  organizacion_id: ORG,
};

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  torneo?: Partial<typeof TORNEO_COMPLETO> | null;
  nivelVerificacion?: 'unverified' | 'basic' | 'trusted';
  torneosPublicados?: number;
  rowCountUpdate?: number;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.startsWith('SELECT nombre, modalidad')) {
          return {
            rows:
              opciones.torneo === null ? [] : [{ ...TORNEO_COMPLETO, ...(opciones.torneo ?? {}) }],
          };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.includes('nivel_verificacion FROM organizacion')) {
          return { rows: [{ nivel_verificacion: opciones.nivelVerificacion ?? 'unverified' }] };
        }
        if (texto.includes("estado NOT IN ('draft', 'cancelled')")) {
          return { rows: [{ count: String(opciones.torneosPublicados ?? 0) }] };
        }
        if (texto.startsWith('UPDATE torneo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('publicarTorneo', () => {
  it('una organización verificada publica en public', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', nivelVerificacion: 'basic' });
    const { publicarTorneo } = await import('./publicarTorneo');
    const resultado = await publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado).toEqual({
      id: TORNEO,
      estado: 'registration_open',
      visibilidad: 'public',
      motivoNoListado: null,
    });
  });

  it('una organización sin verificar publica igual, pero unlisted con el motivo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', nivelVerificacion: 'unverified' });
    const { publicarTorneo } = await import('./publicarTorneo');
    const resultado = await publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado).toEqual({
      id: TORNEO,
      estado: 'registration_open',
      visibilidad: 'unlisted',
      motivoNoListado: 'organizacion_no_verificada',
    });
  });

  it('forzar visibilidad pública sin verificación se rechaza', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', nivelVerificacion: 'unverified' });
    const { publicarTorneo } = await import('./publicarTorneo');
    await expect(
      publicarTorneo({ torneoId: TORNEO, visibilidadDeseada: 'public' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'ORGANIZACION_NO_VERIFICADA' });
  });

  it('sin cupo cargado, DATOS_MINIMOS_INCOMPLETOS nombra el cupo', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      torneo: { cupo_equipos: null as unknown as number },
    });
    const { publicarTorneo } = await import('./publicarTorneo');
    const error = await publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')).catch(
      (e) => e,
    );
    expect(error.codigo).toBe('DATOS_MINIMOS_INCOMPLETOS');
    expect(JSON.stringify(error.detalle)).toContain('cupo');
  });

  it('sin reglamento se publica igual (D-29, no está en los mínimos)', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', nivelVerificacion: 'basic' });
    const { publicarTorneo } = await import('./publicarTorneo');
    await expect(
      publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).resolves.toMatchObject({ estado: 'registration_open' });
  });

  it('un torneo que no está en draft no se puede volver a publicar', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', torneo: { estado: 'registration_open' } });
    const { publicarTorneo } = await import('./publicarTorneo');
    await expect(
      publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
  });

  it('una organización sin verificar con un torneo ya publicado no puede publicar otro', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      nivelVerificacion: 'unverified',
      torneosPublicados: 1,
    });
    const { publicarTorneo } = await import('./publicarTorneo');
    await expect(
      publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'LIMITE_TORNEOS_PUBLICADOS' });
  });

  it('un colaborador no puede publicar', async () => {
    mockearDb({});
    const { publicarTorneo } = await import('./publicarTorneo');
    await expect(
      publicarTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
