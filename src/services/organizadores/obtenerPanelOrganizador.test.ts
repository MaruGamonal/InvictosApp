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
  nivelVerificacion?: 'unverified' | 'basic' | 'trusted';
  usuarioTitularId?: string;
  equiposDistintos?: string;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT rol FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('FROM organizacion WHERE id')) {
          return {
            rows: [
              {
                nombre: 'Liga Palermo',
                logo_url: null,
                nivel_verificacion: opciones.nivelVerificacion ?? 'basic',
                usuario_titular_id: opciones.usuarioTitularId ?? 'u1',
              },
            ],
          };
        }
        if (texto.includes('count(DISTINCT equipo_id)')) {
          return { rows: [{ cantidad: opciones.equiposDistintos ?? '0' }] };
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

    expect(resultado.stats).toEqual({
      activos: 1,
      porComenzar: 1,
      finalizados: 0,
      torneos: 2,
      equipos: 0,
    });
    expect(resultado.activos.map((t) => t.id)).toEqual([T1]);
    expect(resultado.proximos.map((t) => t.id)).toEqual([T2]);
    expect(resultado.necesitanAtencion.map((t) => t.id)).toEqual([T2]);
    expect(resultado.necesitanAtencion[0]?.inscripcionesPendientes).toBe(2);
  });

  it('sin torneos, devuelve listas vacías sin más consultas', async () => {
    mockearDb({ rolOrganizacion: 'owner', torneos: [] });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');

    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.stats).toEqual({
      activos: 0,
      porComenzar: 0,
      finalizados: 0,
      torneos: 0,
      equipos: 0,
    });
    expect(resultado.necesitanAtencion).toEqual([]);
  });

  it('sin permiso sobre la organización, rechaza', async () => {
    mockearDb({ rolOrganizacion: undefined });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');

    await expect(
      obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  /**
   * Un torneo en borrador no cuenta para el límite de D-51: el límite
   * es de torneos **publicados**. Bloquear con un borrador dejaría a
   * la persona sin poder crear el que iba a publicar.
   */
  it('sin verificar, un borrador no alcanza el límite de publicados', async () => {
    mockearDb({
      rolOrganizacion: 'owner',
      nivelVerificacion: 'unverified',
      torneos: [
        {
          id: T1,
          nombre: 'Borrador',
          modalidad: 'f7',
          categoria_genero: 'masculino',
          imagen_url: null,
          estado: 'draft',
          cupo_equipos: 8,
          fecha_inicio_estimada: null,
          fecha_fin_estimada: null,
          inscriptos: '0',
        },
      ],
    });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');
    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.limitePublicadosAlcanzado).toBe(false);
  });

  it('sin verificar y con uno publicado, el límite está alcanzado', async () => {
    mockearDb({
      rolOrganizacion: 'owner',
      nivelVerificacion: 'unverified',
      torneos: [
        {
          id: T1,
          nombre: 'Publicado',
          modalidad: 'f7',
          categoria_genero: 'masculino',
          imagen_url: null,
          estado: 'registration_open',
          cupo_equipos: 8,
          fecha_inicio_estimada: null,
          fecha_fin_estimada: null,
          inscriptos: '0',
        },
      ],
    });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');
    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.limitePublicadosAlcanzado).toBe(true);
    expect(resultado.nivelVerificacion).toBe('unverified');
  });

  /** Verificada, el límite no existe: puede publicar los que quiera. */
  it('verificada, el límite no aplica por más torneos publicados que tenga', async () => {
    mockearDb({
      rolOrganizacion: 'owner',
      nivelVerificacion: 'trusted',
      torneos: [
        {
          id: T1,
          nombre: 'Uno',
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
          nombre: 'Dos',
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
      equiposDistintos: '24',
    });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');
    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.limitePublicadosAlcanzado).toBe(false);
    expect(resultado.stats.equipos).toBe(24);
    expect(resultado.stats.torneos).toBe(2);
  });

  /**
   * Solo el Titular puede pedir la verificación. Un Administrador ve el
   * estado pero no el botón, así que la pantalla necesita el dato.
   */
  it('un Administrador que no es el Titular no figura como titular', async () => {
    mockearDb({
      rolOrganizacion: 'admin',
      usuarioTitularId: 'otra-persona',
      torneos: [],
    });
    const { obtenerPanelOrganizador } = await import('./obtenerPanelOrganizador');
    const resultado = await obtenerPanelOrganizador({ organizacionId: ORG }, contextoCon('u1'));

    expect(resultado.soyTitular).toBe(false);
  });
});
