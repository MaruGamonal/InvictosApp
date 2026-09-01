import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';
const EQUIPO = '22222222-2222-2222-2222-222222222222';
const ORG = '33333333-3333-3333-3333-333333333333';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  rolEnOrganizacion?: 'owner' | 'admin';
  estadoTorneo?: string;
  categoriaTorneo?: string;
  aprobados?: number;
  cupoEquipos?: number;
  equipoExistente?: { id: string; categoria_genero: string } | null;
  yaInscripto?: boolean;
}) {
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('organizacion_id FROM torneo')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.startsWith('SELECT estado, categoria_genero')) {
          return {
            rows: [
              {
                estado: opciones.estadoTorneo ?? 'registration_open',
                categoria_genero: opciones.categoriaTorneo ?? 'male',
                cupo_equipos: opciones.cupoEquipos ?? 8,
              },
            ],
          };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.trim().startsWith('SELECT count(*) FROM inscripcion')) {
          return { rows: [{ count: String(opciones.aprobados ?? 0) }] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string) => {
          consultasCliente.push(texto.trim());
          if (texto.includes('SELECT id, categoria_genero FROM equipo')) {
            return { rows: opciones.equipoExistente ? [opciones.equipoExistente] : [] };
          }
          if (texto.trim().startsWith('SELECT 1 FROM inscripcion')) {
            return { rows: opciones.yaInscripto ? [{}] : [] };
          }
          if (texto.trim().startsWith('INSERT INTO equipo')) {
            return { rows: [{ id: 'equipo-nuevo' }] };
          }
          return { rows: [] };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

describe('inscribirEquipoManual', () => {
  it('carga un equipo que no existe: se crea y queda approved en un solo paso', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    const resultado = await inscribirEquipoManual(
      { torneoId: TORNEO, nombre: 'Equipo Nuevo', categoriaGenero: 'male' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ equipoId: 'equipo-nuevo', advertenciaCategoria: false });
  });

  it('avisa cuando la categoría del equipo no coincide con la del torneo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', categoriaTorneo: 'male' });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    const resultado = await inscribirEquipoManual(
      { torneoId: TORNEO, nombre: 'Equipo Femenino', categoriaGenero: 'female' },
      contextoCon('usuario-1'),
    );

    expect(resultado.advertenciaCategoria).toBe(true);
  });

  it('un torneo mixed no avisa sin importar la categoría del equipo', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', categoriaTorneo: 'mixed' });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    const resultado = await inscribirEquipoManual(
      { torneoId: TORNEO, nombre: 'Equipo X', categoriaGenero: 'female' },
      contextoCon('usuario-1'),
    );

    expect(resultado.advertenciaCategoria).toBe(false);
  });

  it('carga un equipo existente', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      equipoExistente: { id: EQUIPO, categoria_genero: 'male' },
    });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    await expect(
      inscribirEquipoManual({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).resolves.toEqual({ equipoId: EQUIPO, advertenciaCategoria: false });
  });

  it('un equipo que ya tiene inscripción en este torneo no se puede volver a cargar', async () => {
    mockearDb({
      rolEnOrganizacion: 'owner',
      equipoExistente: { id: EQUIPO, categoria_genero: 'male' },
      yaInscripto: true,
    });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    await expect(
      inscribirEquipoManual({ torneoId: TORNEO, equipoId: EQUIPO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('con el torneo cerrado, INSCRIPCIONES_CERRADAS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', estadoTorneo: 'registration_closed' });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    await expect(
      inscribirEquipoManual(
        { torneoId: TORNEO, nombre: 'Equipo Nuevo', categoriaGenero: 'male' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'INSCRIPCIONES_CERRADAS' });
  });

  it('con el cupo ya completo, CUPO_COMPLETO', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', aprobados: 8, cupoEquipos: 8 });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');

    await expect(
      inscribirEquipoManual(
        { torneoId: TORNEO, nombre: 'Equipo Nuevo', categoriaGenero: 'male' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'CUPO_COMPLETO' });
  });

  it('sin equipoId ni nombre, DATOS_INVALIDOS', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');
    await expect(
      inscribirEquipoManual({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('un colaborador no puede cargar equipos a mano', async () => {
    mockearDb({});
    const { inscribirEquipoManual } = await import('./inscribirEquipoManual');
    await expect(
      inscribirEquipoManual(
        { torneoId: TORNEO, nombre: 'Equipo Nuevo', categoriaGenero: 'male' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
