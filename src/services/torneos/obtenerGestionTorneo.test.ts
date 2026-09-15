import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  organizacionId?: string;
  rolOrganizacion?: 'owner' | 'admin';
  torneo?: {
    id: string;
    nombre: string;
    estado: string;
    formato: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    direccion?: string | null;
    ciudad_id?: string;
    costo_inscripcion?: string | null;
    costo_planilla?: string | null;
    cupo_equipos?: number;
    fecha_inicio_estimada?: Date | null;
    organizacion_id?: string;
  };
  fases?: Array<{
    id: string;
    nombre: string;
    tipo_fase: string;
    orden: number;
    cantidad_grupos: string;
  }>;
  inscripciones?: Array<{
    equipo_id: string;
    nombre: string;
    estado: string;
    advertencia_categoria: boolean;
    fecha_solicitud: Date;
  }>;
  partidos?: Array<{
    id: string;
    fase_id: string;
    numero_fecha: number;
    equipo_local_id: string;
    equipo_local_nombre: string;
    equipo_visitante_id: string;
    equipo_visitante_nombre: string;
    goles_local: number | null;
    goles_visitante: number | null;
    estado: string;
    version: number;
    fecha_hora_programada?: Date | null;
    sede_nombre?: string | null;
  }>;
  elegibles?: Array<{
    equipo_id: string;
    perfil_id: string;
    nombre_visible: string;
    rol_en_torneo: 'player' | 'coach';
  }>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT organizacion_id FROM torneo WHERE id')) {
          return {
            rows: opciones.organizacionId ? [{ organizacion_id: opciones.organizacionId }] : [],
          };
        }
        if (texto.includes('SELECT rol FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('SELECT id, nombre, descripcion, imagen_url, direccion')) {
          return { rows: opciones.torneo ? [opciones.torneo] : [] };
        }
        if (texto.includes('FROM fase f LEFT JOIN grupo')) {
          return { rows: opciones.fases ?? [] };
        }
        if (texto.includes('FROM inscripcion i JOIN equipo e')) {
          return { rows: opciones.inscripciones ?? [] };
        }
        if (texto.includes('FROM partido p')) {
          return { rows: opciones.partidos ?? [] };
        }
        if (texto.includes('FROM integrante_habilitado ih')) {
          return { rows: opciones.elegibles ?? [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerGestionTorneo', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');
    await expect(
      obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('sin ser titular ni administrador de la organización, SIN_PERMISO', async () => {
    mockearDb({ organizacionId: 'org-1' });
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');
    await expect(
      obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('trae torneo, fases, inscripciones y partidos para quien administra la organización', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      torneo: {
        id: TORNEO,
        nombre: 'Copa Otoño',
        estado: 'registration_open',
        formato: 'league',
        ciudad_id: 'ciudad-1',
      },
      fases: [
        { id: 'fase-1', nombre: 'Fase única', tipo_fase: 'league', orden: 1, cantidad_grupos: '1' },
      ],
      inscripciones: [
        {
          equipo_id: 'equipo-1',
          nombre: 'Los Pibes',
          estado: 'pending',
          advertencia_categoria: false,
          fecha_solicitud: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      partidos: [
        {
          id: 'partido-1',
          fase_id: 'fase-1',
          numero_fecha: 1,
          equipo_local_id: 'equipo-1',
          equipo_local_nombre: 'Los Pibes',
          equipo_visitante_id: 'equipo-2',
          equipo_visitante_nombre: 'Racing del Barrio',
          goles_local: null,
          goles_visitante: null,
          estado: 'unscheduled',
          version: 1,
          fecha_hora_programada: null,
          sede_nombre: null,
        },
      ],
    });
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');

    const resultado = await obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));

    expect(resultado.nombre).toBe('Copa Otoño');
    expect(resultado.ciudadId).toBe('ciudad-1');
    expect(resultado.fases).toEqual([
      { id: 'fase-1', nombre: 'Fase única', tipoFase: 'league', orden: 1, cantidadGrupos: 1 },
    ]);
    expect(resultado.inscripciones).toEqual([
      {
        equipoId: 'equipo-1',
        nombreEquipo: 'Los Pibes',
        estado: 'pending',
        advertenciaCategoria: false,
        fechaSolicitud: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(resultado.partidos).toEqual([
      {
        id: 'partido-1',
        faseId: 'fase-1',
        numeroFecha: 1,
        equipoLocalId: 'equipo-1',
        equipoLocalNombre: 'Los Pibes',
        equipoVisitanteId: 'equipo-2',
        equipoVisitanteNombre: 'Racing del Barrio',
        golesLocal: null,
        golesVisitante: null,
        estado: 'unscheduled',
        version: 1,
        fechaHoraProgramada: null,
        sedeNombre: null,
      },
    ]);
  });

  it('trae descripción, dirección, costos y cupo para prellenar el formulario de modificar', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      torneo: {
        id: TORNEO,
        nombre: 'Copa Otoño',
        estado: 'registration_open',
        formato: 'league',
        descripcion: 'La copa de siempre',
        imagen_url: 'https://cdn.example.com/copa-otono.png',
        direccion: 'Cancha 3',
        costo_inscripcion: '5000',
        costo_planilla: '1500',
        cupo_equipos: 16,
        fecha_inicio_estimada: new Date('2026-04-12T00:00:00Z'),
      },
    });
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');

    const resultado = await obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));

    expect(resultado.descripcion).toBe('La copa de siempre');
    expect(resultado.imagenUrl).toBe('https://cdn.example.com/copa-otono.png');
    expect(resultado.direccion).toBe('Cancha 3');
    expect(resultado.costoInscripcion).toBe(5000);
    expect(resultado.costoPlanilla).toBe(1500);
    expect(resultado.cupoEquipos).toBe(16);
    expect(resultado.fechaInicioEstimada).toBe('2026-04-12T00:00:00.000Z');
  });

  it('sin imagen cargada, imagenUrl es null (no undefined ni string vacío)', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      torneo: {
        id: TORNEO,
        nombre: 'Copa Otoño',
        estado: 'registration_open',
        formato: 'league',
        imagen_url: null,
      },
    });
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');
    const resultado = await obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));
    expect(resultado.imagenUrl).toBeNull();
  });

  it('UC-07: expone la organización y el rol de quien mira, para saber si puede gestionar Administradores', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'admin',
      torneo: {
        id: TORNEO,
        nombre: 'Copa Otoño',
        estado: 'in_progress',
        formato: 'league',
        organizacion_id: 'org-1',
      },
    });
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');

    const resultado = await obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));

    expect(resultado.organizacionId).toBe('org-1');
    expect(resultado.miRolEnOrganizacion).toBe('admin');
  });

  it('UC-34: agrupa los habilitados elegibles por equipo, para atribuir goles y tarjetas', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      torneo: { id: TORNEO, nombre: 'Copa Otoño', estado: 'in_progress', formato: 'league' },
      elegibles: [
        { equipo_id: 'equipo-1', perfil_id: 'perfil-1', nombre_visible: 'Juan', rol_en_torneo: 'player' },
        { equipo_id: 'equipo-1', perfil_id: 'perfil-2', nombre_visible: 'DT Pedro', rol_en_torneo: 'coach' },
        { equipo_id: 'equipo-2', perfil_id: 'perfil-3', nombre_visible: 'Ana', rol_en_torneo: 'player' },
      ],
    });
    const { obtenerGestionTorneo } = await import('./obtenerGestionTorneo');

    const resultado = await obtenerGestionTorneo({ torneoId: TORNEO }, contextoCon('usuario-1'));

    expect(resultado.elegiblesPorEquipo).toEqual({
      'equipo-1': [
        { perfilId: 'perfil-1', nombreVisible: 'Juan', rolEnTorneo: 'player' },
        { perfilId: 'perfil-2', nombreVisible: 'DT Pedro', rolEnTorneo: 'coach' },
      ],
      'equipo-2': [{ perfilId: 'perfil-3', nombreVisible: 'Ana', rolEnTorneo: 'player' }],
    });
  });
});
