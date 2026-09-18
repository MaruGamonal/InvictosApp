import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const ORG = '11111111-1111-1111-1111-111111111111';
const T1 = '22222222-2222-2222-2222-222222222222';
const T2 = '33333333-3333-3333-3333-333333333333';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolOrganizacion?: 'owner' | 'admin';
  torneos?: Array<{
    id: string;
    nombre: string;
    modalidad: string;
    categoria_genero: string;
    imagen_url: string | null;
    estado: string;
    cupo_equipos: number;
    fecha_inicio_estimada: Date | null;
    fecha_fin_estimada: Date | null;
    inscriptos: string;
  }>;
  inscripcionesPendientes?: Array<{ torneo_id: string; cantidad: string }>;
  resultadosSinCargar?: Array<{ torneo_id: string; cantidad: string }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT rol FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('SELECT nombre, logo_url FROM organizacion')) {
          return { rows: [{ nombre: 'Liga Palermo', logo_url: null }] };
        }
        if (texto.includes('FROM torneo t\n     WHERE')) {
          return { rows: opciones.torneos ?? [] };
        }
        if (
          texto.includes("FROM inscripcion\n     WHERE torneo_id = ANY($1) AND estado = 'pending'")
        ) {
          return { rows: opciones.inscripcionesPendientes ?? [] };
        }
        if (texto.includes("estado = 'scheduled'\n       AND fecha_hora_programada < now()")) {
          return { rows: opciones.resultadosSinCargar ?? [] };
        }
        if (texto.includes('max(numero_fecha)')) return { rows: [] };
        if (texto.includes("estado = 'scheduled'\n     ORDER BY p.torneo_id")) return { rows: [] };
        if (texto.includes("estado = 'played'")) return { rows: [] };
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerPanelOrganizador', () => {
  it('agrupa torneos en activos/proximos/finalizados y calcula stats', async () => {
    mockearDb({
      rolOrganizacion: 'owner',
      torneos: [
        {
          id: T1,
          nombre: 'Liga Apertura',
          modalidad: 'f7',
          categoria_genero: 'masculino',
          imagen_url: null,
          estado: 'in_progress',
          cupo_equipos: 8,
          fecha_inicio_estimada: null,
          fecha_fin_estimada: null,
          inscriptos: '8',
        },
        {
          id: T2,
          nombre: 'Copa Verano',
          modalidad: 'f5',
          categoria_genero: 'mixto',
          imagen_url: null,
          estado: 'registration_open',
          cupo_equipos: 12,
          fecha_inicio_estimada: null,
          fecha_fin_estimada: null,
          inscriptos: '3',
        },
      ],
      inscripcionesPendientes: [{ torneo_id: T2, cantidad: '2' }],
    });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');

    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.stats).toEqual({ activos: 1, porComenzar: 1, finalizados: 0 });
    expect(resultado.activos.map((t) => t.id)).toEqual([T1]);
    expect(resultado.proximos.map((t) => t.id)).toEqual([T2]);
    expect(resultado.necesitanAtencion.map((t) => t.id)).toEqual([T2]);
    expect(resultado.necesitanAtencion[0]?.inscripcionesPendientes).toBe(2);
  });

  it('sin torneos, devuelve listas vacías sin más consultas', async () => {
    mockearDb({ rolOrganizacion: 'owner', torneos: [] });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');

    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.stats).toEqual({ activos: 0, porComenzar: 0, finalizados: 0 });
    expect(resultado.necesitanAtencion).toEqual([]);
  });

  it('sin permiso sobre la organización, rechaza', async () => {
    mockearDb({ rolOrganizacion: undefined });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');

    await expect(
      obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
