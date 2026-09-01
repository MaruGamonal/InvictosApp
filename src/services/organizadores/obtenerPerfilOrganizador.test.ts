import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const ORG = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function filaOrg(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: ORG,
    nombre: 'Liga Demo',
    descripcion: 'Una liga de ejemplo',
    logo_url: null,
    ciudad_id: null,
    ciudad_nombre: null,
    nivel_verificacion: 'basic',
    fecha_alta: new Date('2025-01-01T00:00:00Z'),
    estado: 'active',
    ...over,
  };
}

function mockearDb(opciones: {
  organizacion?: ReturnType<typeof filaOrg> | null;
  torneos?: Record<string, unknown>[];
}) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        consultas.push({ texto: t, valores });
        if (t.startsWith('SELECT o.id, o.nombre')) {
          const org = opciones.organizacion === undefined ? filaOrg() : opciones.organizacion;
          return { rows: org ? [org] : [] };
        }
        if (t.startsWith('SELECT id, nombre, modalidad')) {
          return { rows: opciones.torneos ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('obtenerPerfilOrganizador', () => {
  it('devuelve los datos públicos de la organización', async () => {
    mockearDb({});
    const { obtenerPerfilOrganizador } = await import('./obtenerPerfilOrganizador');

    const perfil = await obtenerPerfilOrganizador({ organizacionId: ORG }, VISITANTE);

    expect(perfil.nombre).toBe('Liga Demo');
    expect(perfil.nivelVerificacion).toBe('basic');
    expect(perfil.trayectoria).toEqual([]);
  });

  it('solo pide torneos finalizados para la trayectoria', async () => {
    const consultas = mockearDb({ torneos: [] });
    const { obtenerPerfilOrganizador } = await import('./obtenerPerfilOrganizador');

    await obtenerPerfilOrganizador({ organizacionId: ORG }, VISITANTE);

    const consultaTorneos = consultas.find((c) =>
      c.texto.startsWith('SELECT id, nombre, modalidad'),
    );
    expect(consultaTorneos!.texto).toContain("estado = 'finished'");
  });

  it('una organización inactive no tiene perfil público: NO_ENCONTRADO', async () => {
    mockearDb({ organizacion: filaOrg({ estado: 'inactive' }) });
    const { obtenerPerfilOrganizador } = await import('./obtenerPerfilOrganizador');
    await expect(
      obtenerPerfilOrganizador({ organizacionId: ORG }, VISITANTE),
    ).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('organización inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ organizacion: null });
    const { obtenerPerfilOrganizador } = await import('./obtenerPerfilOrganizador');
    await expect(
      obtenerPerfilOrganizador({ organizacionId: ORG }, VISITANTE),
    ).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('muestra la trayectoria de torneos finalizados', async () => {
    mockearDb({
      torneos: [
        {
          id: 't1',
          nombre: 'Copa Vieja',
          modalidad: 'f5',
          categoria_edad: 'open',
          fecha_inicio_estimada: new Date('2025-01-01T00:00:00Z'),
          fecha_fin_estimada: new Date('2025-03-01T00:00:00Z'),
        },
      ],
    });
    const { obtenerPerfilOrganizador } = await import('./obtenerPerfilOrganizador');

    const perfil = await obtenerPerfilOrganizador({ organizacionId: ORG }, VISITANTE);

    expect(perfil.trayectoria).toEqual([
      {
        id: 't1',
        nombre: 'Copa Vieja',
        modalidad: 'f5',
        categoriaEdad: 'open',
        fechaInicioEstimada: '2025-01-01T00:00:00.000Z',
        fechaFinEstimada: '2025-03-01T00:00:00.000Z',
      },
    ]);
  });
});
